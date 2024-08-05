import { Button } from "@carbon/react";
import { useRef } from "react";
import { FolderOpen } from "@carbon/icons-react";
import { uploadFolders } from "@/client/express";
import { trpc } from "@/utils/trpc";

export default function FolderImportButton({ pipelineId, blockId }) {
  const trpcUtils = trpc.useUtils();
  const inputRef = useRef(null);

  const handleImport = () => {
    inputRef.current.click();
  };

  const habdleInputChange = async (event) => {
    uploadFolders(pipelineId, blockId, event.target.files);
    trpcUtils.block.file.get.invalidate({
      pipelineId: pipelineId,
      blockId: blockId,
    });
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
