import BlockEditorPanel from "@/components/ui/BlockEditorPanel";
import DrawflowWrapper from "@/components/ui/DrawflowWrapper";
import ForgeTheme from "@/components/ui/ForgeTheme";
import MainContent from "@/components/ui/MainContent";
import Navbar from "@/components/ui/Navbar";
import LibraryFetcher from "@/components/ui/library/LibraryFetcher";
import LibrarySwitcher from "@/components/ui/library/LibrarySwitcher";
import ModalWrapper from "@/components/ui/modal/ModalWrapper";
import ToastWrapper from "@/components/ui/ToastWrapper";
import WorkspaceTabs from "@/components/ui/WorkspaceTabs";
import WorkspaceFetcher from "@/components/ui/WorkspaceFetcher";
import SocketFetcher from "@/components/ui/SocketFetcher";
import ServiceInitializer from "@/components/ServiceInitializer";

import "./styles/globals.scss";
import AnvilConfigurationsModal from "./components/ui/modal/AnvilConfigurationsModal";
import { useState, useEffect } from "react";
import axios from "axios";
import { useAtom } from "jotai";
import { availableKubeContexts } from "@/atoms/kubecontextAtom";
import { ping } from "./client/anvil";
import { activeConfigurationAtom } from "./atoms/anvilConfigurationsAtom";
import AnvilLauncherStatus from "./components/ui/AnvilLauncherStatus";

const serverAddress = import.meta.env.VITE_EXPRESS;

export default function App() {
  const [appIsPackaged, setIsPackaged] = useState(false);
  const [_, setAvailableKubeContexts] = useAtom(availableKubeContexts);
  const [configOpen, setConfigOpen] = useState(false);
  const [confirmationOpen, setConfirmationIsOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState([]);
  const [errModalOpen, setErrModalOpen] = useState(false);
  const [errText, setErrText] = useState([]);
  const [loading, setIsLoading] = useState(false);
  const [currentConfig] = useAtom(activeConfigurationAtom);
  const [logViewerOpen, SystemLogViewerOpen] = useState(false);

  useEffect(() => {
    async function initialLaunch() {
      let isPackaged = false;
      try {
        const res = await axios.get(`${serverAddress}/isPackaged`);
        isPackaged = res.data;
        setIsPackaged(res.data);
      } catch (err) {
        console.log(err.message);
      }

      if (isPackaged) {
        const canPing = await ping(currentConfig);
        if (!canPing) {
          try {
            const kubeResponse = await axios.get(
              `${serverAddress}/get-kube-contexts`,
            );
            setAvailableKubeContexts(kubeResponse.data);
          } catch (err) {
            //once user set their cloud settings, this message won't display again.
            setErrText([
              "Cannot find kubectl or there's an error with kubectl command. Please try again or check if kubectl is in your path or check if your Docker daemon is running. You can ignore this message if you'll use cloud anvil",
              err.response?.data?.kubeErr,
            ]);
            setErrModalOpen(true);
          }

          try {
            const anvilRes = await axios.get(
              `${serverAddress}/get-anvil-config`,
            );
            const data = anvilRes.data;
            if (data.has_config) {
              console.log("HERE ON SECOND RUN");
              const config = data.config;
              const bucketPort = config.Local.BucketPort;
              const driver = config.Local.Driver;
              const serverPort = config.ServerPort;
              const context = config.KubeContext;
              //check this, in case user might've manually changed something, which could potentially cause bugs
              
              const openConfig =
                currentConfig?.anvil?.port === serverPort.toString();
              if (config.IsLocal === true && openConfig === true) {
                console.log("MUST REACH HERE");
                setConfirmationIsOpen(true);
                const configText = [
                  "Are you sure you want to run anvil locally with the following configurations?",
                  "If you are using minikube driver, please make sure you've setup your minikube cluster, and that it's running.",
                  `HOST: 127.0.0.1`,
                  `PORT: ${serverPort}`,
                  `Context: ${context}`,
                  `Driver: ${driver}`,
                ];
                setConfirmationText(configText);
              } else {
                setConfigOpen(true);
              }
            } else {
              setConfigOpen(true);
              setConfirmationIsOpen(false);
            }
          } catch (err) {
            //once user set their cloud settings, this message won't display again.
            setErrText([
              "Error occurred while trying to find your local Anvil configrations. Please try again to set your configurations and relaunch. If you want to use cloud settings, you can set your configurations to cloud instance, and ignore this message.",
              err.response?.data?.err,
              err.response?.data?.kubeErr,
            ]);
            setErrModalOpen(true);
          }
        } else {
          //this is in case, in any point user wishes to change an already pinging config.
          try {
            const kubeResponse = await axios.get(
              `${serverAddress}/get-kube-contexts`,
            );
            setAvailableKubeContexts(kubeResponse.data);
          } catch (err) {
          
          }

        }
      }
    }

    initialLaunch();
  }, []);

  const confirmSettings = async () => {
    SystemLogViewerOpen(true);
    try {
      setIsLoading(true);
      const res = await axios.post(`${serverAddress}/launch-anvil-from-config`);
      setConfirmationIsOpen(false);
      setIsLoading(false);
      setConfigOpen(false);
      setIsLoading(false);
    } catch (err) {
      setConfirmationIsOpen(false);
      setIsLoading(false);
      setConfigOpen(true);
    }
  };

  const closeConfirmation = () => {
    setConfirmationIsOpen(false);
    setConfigOpen(true);
  };

  return (
    <ServiceInitializer>
      <ForgeTheme>
        <Navbar>
          <WorkspaceTabs />
          <LibraryFetcher />
          <BlockEditorPanel />
        </Navbar>
        <LibrarySwitcher />
        <AnvilConfigurationsModal
          open={configOpen}
          onRequestClose={() => setConfigOpen(false)}
          isInitial={true}
          appIsPackaged={appIsPackaged}
          initialLoading={loading}
        />

        <AnvilLauncherStatus
          confirmationHeader="Would you like to run your anvil locally with your existing settings"
          confirmSettings={confirmSettings}
          confirmationClose={closeConfirmation}
          confirmationOpen={confirmationOpen}
          confirmationMessage={confirmationText}
          errorHeader="Following errors happened, please change your local config, or choose a cloud configuration"
          errorClose={() => {
            setErrModalOpen(false);
            setConfigOpen(true);
          }}
          errorOpen={errModalOpen}
          errorMessage={errText}
          logViewerTitle={"System Logs"}
          logViewerOpen={logViewerOpen}
          logViewerClose={() => {
            SystemLogViewerOpen(false);
          }}
        />

        <MainContent>
          <DrawflowWrapper />
        </MainContent>
        <ModalWrapper />
        <ToastWrapper />
        <SocketFetcher />
        <WorkspaceFetcher />
      </ForgeTheme>
    </ServiceInitializer>
  );
}
