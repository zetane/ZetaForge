import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { useAtom } from "jotai";
import { useRef } from "react";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const BUCKET = import.meta.env.VITE_BUCKET

const uploadToS3 = async (key, file) => {
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
  return await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file,
    Metadata: {
      name: file.name,
    }
  }))
}


export const FileBlock = ({blockId, block, setPipeline}) => {
  const [editor] = useAtom(drawflowEditorAtom);
  const fileInput = useRef();

  const loadFile = async (e) => {
    const files = fileInput.current.files
    const file = files[0]
    const name = file.name
    const response = await uploadToS3(`files/${name.toString()}`, file)

    const updatedBlock = {
      ...block,
      action: {
        ...block.action,
        parameters: {
          ...block.action.parameters,
          path: {
            ...block.action.parameters.path,
            value: file.path.toString(),
          },
        },
      },
    };

    setPipeline((prevPipeline) => {
      prevPipeline.data = ({
          ...prevPipeline.data,
          [blockId]: updatedBlock,
      })
    });
  }

  const path = block.action.parameters?.path?.value || '';

  return (
    <div className="block-content">
      <input
        id="file-block"
        type="file"
        ref={fileInput}
        onChange={(e) => { loadFile(e) }}
        parameters-path
      />
    </div>
  )
}