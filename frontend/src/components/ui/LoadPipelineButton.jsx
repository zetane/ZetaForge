import { useRef } from "react";
import { HeaderMenuItem } from "@carbon/react";
import { useLoadPipeline } from "./useLoadPipeline";

const FILE_EXTENSION_REGEX = /\.[^/.]+$/;

export default function LoadPipelineButton() {
  const loadPipeline = useLoadPipeline();
  const fileInput = useRef();

  const selectFile = () => {
    fileInput.current.click();
  };

  const handleFileChange = async (event) => {
    const files = event.target.files
    for (const key in files) {
      const file = files[key]
      let relPath = file.webkitRelativePath
      if (!relPath) {
        continue;
      }
      relPath = relPath.replaceAll('\\', '/')
      const folder = relPath.split("/")[0]
      const pipelineName = file.name.replace(FILE_EXTENSION_REGEX, "");
      if (folder == pipelineName) {
        await loadPipeline(file);
        event.target.value = ''; // Reset the file input
      }
    }
  };

  return (
    <div>
      <HeaderMenuItem onClick={selectFile}>Load Pipeline</HeaderMenuItem>
      <input
        type="file"
        webkitdirectory=""
        directory=""
        ref={fileInput}
        onChange={handleFileChange}
        hidden
      />
    </div>
  );
};
