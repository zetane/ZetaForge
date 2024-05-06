import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { pipelineSchemaAtom } from "@/atoms/pipelineSchemaAtom";
import { trpc } from "@/utils/trpc";
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Button } from "@carbon/react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useAtom } from "jotai";
import { useImmerAtom } from "jotai-immer";
import { useRef, useState } from "react";
import { uuidv7 } from "uuidv7";
import ClosableModal from "./modal/ClosableModal";
import { mixpanelAtom } from "@/atoms/mixpanelAtom";

const BUCKET = import.meta.env.VITE_BUCKET

export default function RunPipelineButton({modalPopper, children, action}) {
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [validationErrorMsg, setValidationErrorMsg] = useState([]);
  const [pipelineSchema, _] = useAtom(pipelineSchemaAtom);
  const [isOpen, setIsOpen] = useState(false);
  const [angle, setAngle] = useState(0)
  const posRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 2, y: 2 });
  const [mixpanelService] = useAtom(mixpanelAtom)

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
            const sysPath = param.value
            let filePath = param.value;
            filePath = filePath.replaceAll('\\', '/')
            const paths = filePath.split("/")
            const name = paths.at(-1)
            const awsKey = `files/${name}`

            if (filePath && filePath.trim() !== "") {
              const res = await checkAndWriteToS3(awsKey, sysPath);
              param.value = `"${name}"`
            }
          }
        }
      }
    }
    return pipeline
  }

  const mutation = useMutation({
    mutationFn: async (execution) => {
      return axios.post(`${import.meta.env.VITE_EXECUTOR}/execute`, execution)
    },
  })

  const runPipeline = async (editor, pipeline) => {
    // check if pipeline structure exists
    if (!pipeline.data || !Object.keys(pipeline.data).length) return null;
    const results = pipelineSchema.safeParse(pipeline.data);

    if (!results.success) {
      setValidationErrorMsg(prev => {
        return results.error.issues.map(block => `${block.path[0]}: ${block.message}`)
      })
      setIsOpen(true)
      return null;
    } else {
      setValidationErrorMsg([]);
    }

    let pipelineSpecs = editor.convert_drawflow_to_block(pipeline.name, pipeline.data);
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
      pipelineSpecs['id'] = pipeline.id
      const execution = {
        id: uuidv7(),
        pipeline: pipelineSpecs,
      }
      const res = await mutation.mutateAsync(execution)
      if (res.status == 201) {
        setPipeline((draft) => {
          draft.socketUrl = `ws://localhost:8080/ws/${pipelineSpecs.id}`;
          draft.history = pipeline.id + "/" + res.data.executionId
          draft.saveTime = Date.now()
          draft.log = []
        })
      }
      try {
        mixpanelService.trackEvent('Run Created')
      } catch (err) {
  
      }
      
    } catch (error) {

    }
  };

  const styles = {
    margin: '5px',
  };

  return (
    <>
      <Button style={styles} size="sm" onClick={() => { runPipeline(editor, pipeline) }}>
        <span>{ action }</span>
        { children }
      </Button>

      <ClosableModal
        modalHeading="The following error(s) occurred:"
        passiveModal={true}
        open={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <div className="flex flex-col gap-4 p-3">
          {validationErrorMsg.map((error, i) => {
            return (
              <p key={"error-msg-"+i}>{error}</p>
            )
          })}
        </div>
      </ClosableModal>
    </>
  );
}
