import CodeViewer from "./CodeViewer";
import CodeEditor from "./CodeEditor";
import { useContext } from "react";
import { FileHandleContext } from "./FileHandleContext";

export default function FileViewer() {
  const fileHandle = useContext(FileHandleContext);

  let viewerComponent;
  if (fileHandle.currentFile) {
    //TODO isSelectedProperty?
    if (fileHandle.isReadOnly) {
      viewerComponent = <CodeViewer />;
    } else {
      viewerComponent = <CodeEditor />;
    }
  } else {
    viewerComponent = <></>;
  }

  return viewerComponent;
}
