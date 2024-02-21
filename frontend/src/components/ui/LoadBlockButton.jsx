import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";
import { useRef } from "react";
import { getDirectoryPath } from "@/../utils/fileUtils";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import {trpc} from "@/utils/trpc"

export default function LoadBlockButton() {
  const FILE_EXTENSION_REGEX = /\.[^/.]+$/;
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useAtom(pipelineAtom)
  const fileInput = useRef();

  const selectFile = () => {
    fileInput.current.click();
  };

  const saveBlock = trpc.saveBlock.useMutation();

  const loadBlock = async (pipeline) => {
    const files = fileInput.current.files
    for (const key in files) {
      const file = files[key]
      const name = removeFileExtension(file.name)
      if (name === "specs_v1") {
        const specs = JSON.parse(await (new Blob([file])).text())
        const blockPath = getDirectoryPath(file.path)
        editor.load_block(specs);
        const data = {
          blockSpec: specs,
          blockPath: blockPath,
          pipelinePath: pipeline.buffer
        }

        const res = await saveBlock.mutate(data)

        break;
      }
    }
  };

  const removeFileExtension = (fileName) => {
    return fileName.replace(FILE_EXTENSION_REGEX, "");
  };

  return (
    <div>
      <HeaderMenuItem onClick={selectFile}>Block</HeaderMenuItem>
      <input
        type="file"
        webkitdirectory=""
        directory=""
        ref={fileInput}
        onChange={(e) => { loadBlock(pipeline) }}
        hidden
      />
    </div>
  );
}
