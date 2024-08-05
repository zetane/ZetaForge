import { Button } from "@carbon/react";
import { useRef } from "react";
import { DocumentDownload } from "@carbon/icons-react";
import { uploadFiles } from "@/client/express";

export default function FileImportButton({ pipelineId, blockId }) {
  const inputRef = useRef(null);

  const handleImport = () => {
    inputRef.current.click();
  };

  const handleInputChange = async (event) => {
    uploadFiles(pipelineId, blockId, event.target.files);
  };

  return (
    <>
      <Button
        renderIcon={DocumentDownload}
        size="sm"
        iconDescription="Import files"
        onClick={handleImport}
        title="Import files into your block folder"
      >
        Add Files
      </Button>
      <input
        type="file"
        ref={inputRef}
        onChange={handleInputChange}
        multiple
        hidden
      />
    </>
  );
}
