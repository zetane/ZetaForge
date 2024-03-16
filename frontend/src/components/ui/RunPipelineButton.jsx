import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { HeaderGlobalAction } from "@carbon/react";
import { useAtom } from "jotai";
import { PlayFilledAlt } from "@carbon/icons-react"
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useImmerAtom } from "jotai-immer";
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useState, useEffect, useRef } from "react";
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'
import { trpc } from "@/utils/trpc";

const BUCKET = import.meta.env.VITE_BUCKET

export default function RunPipelineButton() {
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [socketUrl, setSocketUrl] = useState(null);
  const [shouldConnect, setShouldConnect] = useState(false);
  const [angle, setAngle] = useState(0)
  const posRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 2, y: 2 });

  const s3Uploader = trpc.uploadToS3.useMutation()

  const checkFileExistsInS3 = async (key) => {
    const creds = {
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    }
    
    const client = new S3Client({
      region: 'us-east-2',
      credentials: creds,
      endpoint: import.meta.env.VITE_S3_ENDPOINT,
      forcePathStyle: true
    })
  
    const fileKey = `${key}`
  
    const params = {
      Bucket: BUCKET,
      Key: fileKey,
    };
  
    try {
      await client.send(new HeadObjectCommand(params));
      return true;
    } catch (err) {
      console.log("E: ", err.name)
      if (err.name === 'NotFound') {
        return false;
      }
      console.error('Error checking file existence in S3:', err);
      throw err;
    }
  }
  
  const checkAndWriteToS3 = async (key, filePath) => {
    // Check if the file exists in S3
    const fileExists = await checkFileExistsInS3(key);
  
    if (!fileExists) {
      // Write the file to S3
      const data = {filePath: filePath}
      const res = await s3Uploader.mutateAsync(data);
    }
  }
  
  const processNodes = async (pipeline) => {
    const nodes = pipeline.pipeline
    for (const nodeId in nodes) {
      const node = nodes[nodeId];

      const parameters = node.action?.parameters;

      if (parameters) {
        for (const paramKey in parameters) {
          const param = parameters[paramKey];

          if (param.type === "file") {
            let filePath = param.value;
            filePath = filePath.replaceAll('\\', '/')
            const paths = filePath.split("/")
            const name = paths.at(-1)
            const awsKey = `files/${name}`

            if (filePath && filePath.trim() !== "") {
              const res = await checkAndWriteToS3(awsKey, filePath);
              param.value = `"${name}"`
            }
          }
        }
      }
    }
    return pipeline
  }

  const mutation = useMutation({
    mutationFn: async (pipeline) => {
      return axios.post(`${import.meta.env.VITE_EXECUTOR}/execute`, pipeline)
    },
  })

  const { sendMessage, lastMessage, readyState } = useWebSocket(
    shouldConnect ? socketUrl : null,
    {
      shouldReconnect: () => false,
    }
  );

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  }[readyState];

  useEffect(() => {
    if (lastMessage !== null) {
      setPipeline((draft) => {
        const mess = JSON.parse(lastMessage.data).content
        const splitMess = mess.split("::::")
        // slices off the []
        const pod = splitMess[0].slice(1, -1)
        if (draft.data[pod]) {
          // deep copy
          const findPod = JSON.parse(JSON.stringify(draft.data[pod]))
          const message = splitMess[1].trim()
          const tagAndObject = message.split("|||")
          const tag = tagAndObject[0].trim()
          if (tag == "outputs") {
            // attempt to parse the output
            const outs = JSON.parse(tagAndObject[1])
            for (const [key, value] of Object.entries(outs)) {
              if (!findPod.events.outputs) {
                findPod.events["outputs"] = {}
              }
              findPod.events.outputs[key] = value
            }
          }
          if (tag == "inputs") {
            const outs = JSON.parse(tagAndObject[1])
            for (const [key, value] of Object.entries(outs)) {
              if (!findPod.events.inputs) {
                findPod.events["inputs"] = {}
              }
              findPod.events["inputs"][key] = value
            }
          }
          if (findPod.events.log) {
            findPod.events.log.concat(message)
          } else {
            findPod.events["log"] = [message]
          }
          draft.data = {
            ...draft.data,
            [pod]: findPod
          }
        }
        draft.log = draft.log.concat(`${mess}\n`)
      })
      //setMessageHistory((prev) => prev.concat(lastMessage));
    }
  }, [lastMessage]);

  useEffect(() => {
    if (socketUrl) {
      setShouldConnect(true);
      const interval = setInterval(() => {
        /*
        let pos = posRef.current;
        let velocity = velocityRef.current;
        console.log("x: ", pos.x)
        console.log("v: ", velocity)

        if (pos.x <= -80 || pos.x >= 80) {
          velocity.x = -velocity.x;
        }

        if (pos.y <= -80 || pos.y >= 80) {
          velocity.y = -velocity.y;
        }
        console.log("v: ", velocity)
        const x2 = pos.x + velocity.x
        const y2 = pos.y + velocity.y
        console.log("x2: ", x2)

        posRef.current = {x: x2, y: y2}
        */
        setAngle((prevAngle) => (prevAngle + 2));
      }, 16);

      return () => {
        setAngle(0)
        posRef.current = { x: 0, y: 0 }
        velocityRef.current = { x: 2, y: 2 }
        clearInterval(interval);
      };
    }
  }, [socketUrl]);

  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      // WebSocket connection is open, perform any necessary actions
    } else if (readyState === ReadyState.CLOSED) {
      // WebSocket connection is closed, reset the state
      setSocketUrl(null);
      setShouldConnect(false);
    }
  }, [readyState]);

  const runPipeline = async (editor, pipeline) => {
    let pipelineSpecs = editor.convert_drawflow_to_block(pipeline.name);
    pipelineSpecs = await processNodes(pipelineSpecs)

    try {
      // tries to put history in a user path if it exists, if not
      // will put it into the buffer path (.cache)
      pipelineSpecs['sink'] = pipeline.path ? pipeline.path : pipeline.buffer
      // Pull containers from the buffer to ensure the most recent ones
      // In the case where a user has a savePath but a mod has happened since
      // Last save
      // TODO: Set a flag (right now it's a timestamp)
      // and break the cache when user mods the canvas
      pipelineSpecs['build'] = pipeline.buffer
      pipelineSpecs['name'] = pipeline.name
      const res = await mutation.mutateAsync(pipelineSpecs)
      if (res.status == 201) {
        setSocketUrl(`ws://localhost:8080/ws/${pipelineSpecs.id}`)
        setPipeline((draft) => {
          draft.history = res.data.history
          draft.saveTime = Date.now()
          draft.log = []
        })
      }
    } catch (error) {

    }
  };

  const styles = {
    transform: `translate(${posRef.current.x}px, ${posRef.current.y}px) rotate(${angle}deg)`,
    transformOrigin: 'center',
    transition: 'transform 0.5s ease-in-out',
    filter: `drop-shadow(0 0 10px rgba(0, 0, 0, 0.3))`,
  };

  return (
    <HeaderGlobalAction aria-label="Run" disabled={shouldConnect} >
      <PlayFilledAlt size={20} onClick={() => { runPipeline(editor, pipeline) }} style={styles} />
    </HeaderGlobalAction>
  );
}
