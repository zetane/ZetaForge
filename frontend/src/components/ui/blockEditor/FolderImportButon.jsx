import { Button } from "@carbon/react";
import { useRef } from "react";
import { FolderOpen } from "@carbon/icons-react";
import { uploadFolders } from "@/client/express";

export default function FolderImportButton({ pipelineId, blockId }) {
  const inputRef = useRef(null);

  const handleImport = () => {
    inputRef.current.click();
  };

  const habdleInputChange = async (event) => {
    uploadFolders(pipelineId, blockId, event.target.files);
  };

  return (
    <>
      <Button
        renderIcon={FolderOpen}
        size="sm"
        iconDescription="Import folder"
        onClick={handleImport}
        title="Import folder into your block folder"
      >
        Add Folder
      </Button>
      <input
        type="file"
        ref={inputRef}
        onChange={habdleInputChange}
        webkitdirectory="true"
        multiple
        hidden
      />
    </>
  );
}
