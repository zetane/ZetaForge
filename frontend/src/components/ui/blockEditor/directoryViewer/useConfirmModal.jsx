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

                fileHandle.set(selectedFile);
        };

        const close = () => {
                setIsOpen(false);
        };

        const save = () => {
                fileBuffer.save();
                fileHandle.set(selectedFile);
                close();
        };

        const discard = () => {
                fileHandle.set(selectedFile);
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

