import { useState, useContext } from "react";
import { FileBufferContext } from "@/components/ui/blockEditor/directoryViewer/DirectoryViewer";
import { FileHandleContext } from "@/components/ui/blockEditor/directoryViewer/DirectoryViewer";

export default function useConfirmModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState();
  const fileBuffer = useContext(FileBufferContext);
  const fileHandle = useContext(FileHandleContext);

  const confirm = async (selectedFile) => {
    if (fileBuffer.hasPendingChanges) {
      setSelectedFile(selectedFile);
      setIsOpen(true);
      return;
    }

    fileHandle.set(selectedFile);
  };

  const close = () => {
    setIsOpen(false);
  };

  const save = async () => {
    fileBuffer.save();
    await fileHandle.set(selectedFile);
    close();
  };

  const discard = async () => {
    await fileHandle.set(selectedFile);
    close();
  };

  return {
    isOpen,
    confirm,
    save,
    discard,
    close,
  };
}
