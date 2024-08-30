import CodeViewer from "./CodeViewer";
import CodeEditor from "./CodeEditor";
import { useContext } from "react";
import { FileHandleContext } from "./FileHandleContext";
import { ViewerCodeMirror } from "./CodeMirrorComponents";

export default function FileViewer() {
  const fileHandle = useContext(FileHandleContext);

  let viewerComponent;
  if (!fileHandle.isSelected) {
    viewerComponent = <></>;
  } else if (fileHandle.write && fileHandle.read) {
    viewerComponent = <CodeEditor />;
  } else if (!fileHandle.write && fileHandle.read) {
    viewerComponent = <CodeViewer />;
  } else {
    viewerComponent = <ViewerCodeMirror code={"File type is not supported"} />;
  }

  return <div className="h-full pr-1.5">{viewerComponent}</div>;
}
