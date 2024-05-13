import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { useAtom } from "jotai";
import { useRef, useState } from "react";
import ReactDOM from "react-dom";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import ClosableModal from "../modal/ClosableModal";

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
  try {
    return await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file,
      Metadata: {
        name: file.name,
      }
    }))
  } catch (err) {
    console.error('Error uploading file to S3:', err);
    throw err;
  }
}


export const FileBlock = ({blockId, block, setFocusAction}) => {
  const fileInput = useRef();
  const [validationErrorMsg, setValidationErrorMsg] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const loadFile = async (e) => {
    try {
      const files = fileInput.current.files
      if(!files.length) { return }
      const file = files[0]
      const name = file.name
      const response = await uploadToS3(`files/${name.toString()}`, file)
      const value = file.path.toString()
      setFocusAction((draft) => { draft.data[blockId].action.parameters['path'].value = value })
      setValidationErrorMsg([])
    } catch (error) {
      setValidationErrorMsg([`Error uploading file to S3: ${error.message}`])
      setIsOpen(true)
    }
  }

  const path = block.action.parameters?.path?.value || '';

  return (
    <>
      <div className="block-content">
        <input
          id="file-block"
          type="file"
          ref={fileInput}
          onChange={(e) => { loadFile(e) }}

          parameters-path="true"
        />
      </div>

      {typeof window !== "undefined" &&
        ReactDOM.createPortal(
          <ClosableModal
            modalHeading="The following error(s) occurred:"
            passiveModal={true}
            open={isOpen}
            onRequestClose={() => setIsOpen(false)}
            className="cds--g100 cds--layer-one"
          >
            <div className="flex flex-col gap-4 p-3">
              {validationErrorMsg.map((error, i) => {
                return (
                  <p key={"error-msg-"+i}>{error}</p>
                )
              })}
            </div>
          </ClosableModal>,
          document.body
        )
      }
    </>
  )
}