import { useContext } from "react";
import { FileBufferContext } from "./FileBufferContext";
import { FileHandleContext } from "./FileHandleContext";

export function useConfirmModal() {
        const [isOpen, setIsOpen] = useState(false);
        const [selectedFile, setSelectedFile] = useState();
        const fileBuffer = useContext(FileBufferContext);
        const fileHandle = useContext(FileHandleContext);

        const confirm = (selectedFile) => {
                if (fileBuffer.hasPendingChanges) {
                        setSelectedFile(selectedFile);
                        setIsOpen(true);
                        return;
                }

                fileHandle.setCurrentFile(selectedFile);
        };

        const close = () => {
                setIsOpen(false);
        };

        const save = () => {
                fileBuffer.save();
                fileHandle.setCurrentFile(selectedFile);
                close();
        };

        const discard = () => {
                fileHandle.setCurrentFile(selectedFile);
                close();
        };

        return {
                isOpen: isOpen,
                confirm: confirm,
                save: save,
                discard: discard,
                close: close,
        };
}

