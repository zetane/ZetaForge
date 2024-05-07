package main

import (
	"bytes"
	"context"
	"embed"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"time"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
)

const WAIT_TIME = 5 * time.Second

//go:embed setup/*
var kubectlFiles embed.FS

func portForward(ctx context.Context, service string, namespace string, port int, targetPort int, stopCh <-chan struct{}, readyCh chan struct{}, clientConfig *rest.Config) error {
	clientset, err := kubernetes.NewForConfig(clientConfig)
	if err != nil {
		return err
	}

	svc, err := clientset.CoreV1().Services(namespace).Get(ctx, service, metav1.GetOptions{})
	if err != nil {
		return err
	}

	labels := []string{}
	for key, val := range svc.Spec.Selector {
		labels = append(labels, key+"="+val)
	}
	label := strings.Join(labels, ",")

	pods, err := clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{LabelSelector: label, Limit: 1})
	if err != nil {
		return err
	}

	if len(pods.Items) == 0 {
		return errors.New("no pods associated with service " + service)
	}
	pod := pods.Items[0]

	podPort := targetPort
	for _, val := range svc.Spec.Ports {
		if int(val.Port) == targetPort {
			podPort = val.TargetPort.IntValue()
			break
		}
	}

	transport, upgrader, err := spdy.RoundTripperFor(clientConfig)
	if err != nil {
		return err
	}

	hostIP := strings.TrimLeft(clientConfig.Host, "https://")
	path := "/api/v1/namespaces/" + namespace + "/pods/" + pod.Name + "/portforward"

	dialer := spdy.NewDialer(upgrader, &http.Client{Transport: transport}, http.MethodPost, &url.URL{Scheme: "https", Path: path, Host: hostIP})
	fw, err := portforward.New(dialer, []string{fmt.Sprintf("%d:%d", port, podPort)}, stopCh, readyCh, os.Stdout, os.Stderr)
	if err != nil {
		return err
	}
	return fw.ForwardPorts()
}

func kubectlResources(clientConfig *rest.Config) (map[string]string, error) {
	mapping := make(map[string]string)
	discoveryClient, err := discovery.NewDiscoveryClientForConfig(clientConfig)
	if err != nil {
		return mapping, err
	}

	res, err := discoveryClient.ServerPreferredResources()
	if err != nil {
		return mapping, err
	}

	for _, resources := range res {
		for _, resource := range resources.APIResources {
			mapping[resource.Kind] = resource.Name
		}
	}

	return mapping, nil
}

func kubectlApply(filePath string, resources map[string]string, clientConfig *rest.Config) error {
	file, err := kubectlFiles.ReadFile(filePath)
	if err != nil {
		return err
	}
	reader := io.NopCloser(bytes.NewReader(file))

	dynamicClient, err := dynamic.NewForConfig(clientConfig)
	if err != nil {
		return err
	}

	item := yaml.NewDocumentDecoder(reader)

	var obj unstructured.Unstructured
	decoder := scheme.Codecs.UniversalDeserializer()
	buffer := make([]byte, 1024*1024*5)
	for {
		n, err := item.Read(buffer)
		if err != nil {
			if err == io.EOF {
				return nil
			}
			return err
		}

		_, gvk, err := decoder.Decode(buffer[:n], nil, &obj)
		if err != nil {
			return err
		}

		gvr := schema.GroupVersionResource{Group: gvk.Group, Version: gvk.Version, Resource: resources[gvk.Kind]}
		namespace := obj.GetNamespace()
		name := obj.GetName()
		_, err = dynamicClient.Resource(gvr).Namespace(namespace).Apply(context.Background(), name, &obj, metav1.ApplyOptions{FieldManager: name})
		if err != nil {
			return err
		}
		log.Printf("Resource %s %s applied", gvk.Kind, name)
	}
}

func kubectlCheckPods(ctx context.Context, clientConfig *rest.Config) error {
	clientset, err := kubernetes.NewForConfig(clientConfig)
	if err != nil {
		return err
	}

	for {
		pods, err := clientset.CoreV1().Pods("default").List(ctx, metav1.ListOptions{LabelSelector: "app.kubernetes.io/name=weed"})
		if err != nil {
			return err
		}

		if len(pods.Items) > 0 {
			phase := pods.Items[0].Status.Phase
			if phase == v1.PodRunning {
				break
			} else if phase == v1.PodFailed || phase == v1.PodSucceeded {
				return errors.New("bucket has stopped working")
			}
		}

		log.Println("Waiting on bucket...")
		time.Sleep(WAIT_TIME)
	}

	return nil
}

func setup(config Config, client clientcmd.ClientConfig) {
	clientConfig, err := client.ClientConfig()
	if err != nil {
		log.Fatalf("Failed to get client config; err=%v", err)
	}

	log.Println("Starting Setup...")
	resources, err := kubectlResources(clientConfig)
	if err != nil {
		log.Fatalf("Failed to fetch kubernetes resources; err=%v", err)
	}
	if err := kubectlApply("setup/install.yaml", resources, clientConfig); err != nil {
		log.Fatalf("Failed to install argo; err=%v", err)
	}
	if err := kubectlApply("setup/build.yaml", resources, clientConfig); err != nil {
		log.Fatalf("Failed to install bucket; err=%v", err)
	}

	if err := kubectlCheckPods(context.Background(), clientConfig); err != nil {
		log.Fatalf("Setup execution failed; err=%v", err)
	}
	log.Println("Setup Successful")

	signals := make(chan os.Signal, 1)
	signal.Notify(signals, os.Interrupt)

	if config.Local.Driver == "minikube" {
		stopBucketCh := make(chan struct{}, 1)
		readyBucketCh := make(chan struct{})
		go func() {
			if err := portForward(context.Background(), "weed", "default", config.Local.BucketPort, 8333, stopBucketCh, readyBucketCh, clientConfig); err != nil {
				log.Fatalf("Port-Forwarding error; err=%v", err)
			}
		}()
		go func() {
			<-signals
			log.Println("Starting Shutdown...")
			if stopBucketCh != nil {
				close(stopBucketCh)
			}
			log.Println("Shutdown Successful")
			signal.Stop(signals)
			os.Exit(1)
		}()
		<-readyBucketCh
	} else {
		go func() {
			<-signals
			log.Println("Starting Shutdown...")
			log.Println("Shutdown Successful")
			signal.Stop(signals)
			os.Exit(1)
		}()
	}
}
