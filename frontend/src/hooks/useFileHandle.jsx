import { useState } from "react";
import { BLOCK_SPECS_FILE_NAME, CHAT_HISTORY_FILE_NAME } from "@/utils/constants";

const READ_ONLY_FILES = [BLOCK_SPECS_FILE_NAME, CHAT_HISTORY_FILE_NAME];
export default function useFileHandle() {
  const [currentFile, setCurrentFile] = useState();
  const isComputation = currentFile?.name === "computations.py";
  const isReadOnly = READ_ONLY_FILES.some((fileName) =>
    currentFile?.name?.endsWith(fileName) ?? false,
  );
  // TODO set according to file in backend
  const isSupported = true;

  return {
    currentFile,
    setCurrentFile,
    isComputation,
    isReadOnly,
    isSupported,
  };
}
