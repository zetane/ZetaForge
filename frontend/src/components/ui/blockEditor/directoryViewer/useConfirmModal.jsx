import { useContext } from "react";
import { FileBufferContext } from "./FileBufferContext";
import { FileHandleContext } from "./FileHandleContext";

export function useConfirmModal() {
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

    await fileHandle.set(selectedFile);
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
