import {  useContext } from "react";
import { ViewerCodeMirror } from "./CodeMirrorComponents";
import { FileBufferContext } from "./FileBufferContext";

export default function CodeViewer() {
  const fileBuffer = useContext(FileBufferContext)
  return <ViewerCodeMirror code={fileBuffer.content ?? ""} />
}
