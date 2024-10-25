import { mixpanelAtom } from "@/atoms/mixpanelAtom";
import { PIPELINE_SPECS_FILE_NAME } from "@/utils/constants";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";
import { useRef } from "react";
import { useLoadPipeline } from "@/hooks/useLoadPipeline";

const FILE_EXTENSION_REGEX = /\.[^/.]+$/;

export default function LoadPipelineButton() {
  const loadPipeline = useLoadPipeline();
  const fileInput = useRef();
  const [mixpanelService] = useAtom(mixpanelAtom);

  const selectFile = () => {
    fileInput.current.click();
  };

  const handleFileChange = async (event) => {
    try {
      mixpanelService.trackEvent("Load Pipeline");
    } catch (err) {
      console.error(err);
    }
    const files = event.target.files;
    for (const key in files) {
      const file = files[key];
      let relPath = file.webkitRelativePath;
      if (!relPath) {
        continue;
      }
      relPath = relPath.replaceAll("\\", "/");
      const parts = relPath.split("/");
      if (parts.length == 2) {
        const pipelineName = parts[0];
        const fileName = parts[1];
        const fileNameNoExtension = parts[1].replace(FILE_EXTENSION_REGEX, "");
        if (
          fileNameNoExtension == pipelineName ||
          fileName == PIPELINE_SPECS_FILE_NAME
        ) {
          await loadPipeline(file);
          event.target.value = ""; // Reset the file input
        }
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
}
