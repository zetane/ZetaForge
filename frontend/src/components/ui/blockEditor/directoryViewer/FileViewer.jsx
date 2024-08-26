import CodeViewer from "./CodeViewer";
import CodeEditor from "./CodeEditor";
import { useContext } from "react";
import { FileHandleContext } from "./FileHandleContext";

export default function FileViewer() {
  const fileHandle = useContext(FileHandleContext);

  const getViewer = () => {
    if (fileHandle.currentFile) {//TODO isSelectedProperty?
      if (fileHandle.isReadOnly) {
        return <CodeViewer />;
      } else {
        return <CodeEditor />;
      }
    } else {
      return <></>;
    }
  };

  return getViewer();
}
