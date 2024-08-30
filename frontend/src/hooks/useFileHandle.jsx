import { useState } from "react";

export default function useFileHandle() {
  const [currentFile, setCurrentFile] = useState();
  const isComputation = currentFile?.name === "computations.py";

  return {
    ...currentFile,
    currentFile,//TODO remove
    set: setCurrentFile,
    isComputation,
  };
}
