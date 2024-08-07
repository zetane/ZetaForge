import { Modal } from "@carbon/react";
import {
  BLOCK_SPECS_FILE_NAME,
  CHAT_HISTORY_FILE_NAME,
} from "@/utils/constants";
import { useState } from "react";
import CodeViewer from "./CodeViewer";
import CodeEditor from "./CodeEditor";

const READ_ONLY_FILES = [BLOCK_SPECS_FILE_NAME, CHAT_HISTORY_FILE_NAME];
export default function FileViewer({ pipelineId, blockId, currentFile }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  const isReadOnly = READ_ONLY_FILES.some((fileName) =>
    currentFile.relativePath.endsWith(fileName),
  );

  const handleModalConfirm = (e) => {
    // saveChanges(e);
    // if (pendingFile) {
    //   const relPath = pendingFile.replaceAll("\\", "/");
    //   const pathSegments = relPath.split("/");
    //   let fileContent = fileSystem;
    //
    //   for (let i = 0; i < pathSegments.length; i++) {
    //     const segment = pathSegments[i];
    //     if (i === pathSegments.length - 1) {
    //       fileContent = fileContent[segment].content;
    //     } else {
    //       fileContent = fileContent[segment].content;
    //     }
    //   }
    //
    //   setCurrentFile({ path: pendingFile, content: fileContent });
    // }
    // setIsModalOpen(false);
    // setPendingFile(null);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
          {isReadOnly ? (
            <CodeViewer
              pipelineId={pipelineId}
              blockId={blockId}
              currentFile={currentFile}
            />
          ) : (
            <CodeEditor
              pipelineId={pipelineId}
              blockId={blockId}
              currentFile={currentFile}
            />
          )}
      <Modal
        open={isModalOpen}
        modalHeading="Unsaved Changes"
        primaryButtonText="Save Changes"
        secondaryButtonText="Cancel"
        onRequestSubmit={handleModalConfirm}
        onRequestClose={handleModalCancel}
        size="xs"
      >
        <p>You have unsaved changes. Do you want to save them?</p>
      </Modal>
    </>
  );
}
