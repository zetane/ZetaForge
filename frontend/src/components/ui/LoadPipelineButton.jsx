import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";
import { useRef } from "react";
import { getDirectoryPath } from "@/../utils/fileUtils";
import { useImmerAtom } from "jotai-immer";
import { genJSON } from "@/utils/blockUtils";
import { trpc } from "@/utils/trpc";

export default function LoadPipelineButton() {
  const FILE_EXTENSION_REGEX = /\.[^/.]+$/;
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const fileInput = useRef();

  const savePipelineMutation = trpc.savePipeline.useMutation()

  const selectFile = () => {
    fileInput.current.click();
  };

  const loadPipeline = async () => {
    const files = fileInput.current.files
    for (const key in files) {
      const file = files[key]
      const folder = file.webkitRelativePath.split("/")[0]
      const name = removeFileExtension(file.name)
      if (folder == name) {
        // Clear drawflow canvas
        editor.clearModuleSelected()

        // We don't need to purge the cache on disk
        // bc the savePipeline call below will 
        const data = JSON.parse(await (new Blob([file])).text())
        console.log(data)
        const folderPath = getDirectoryPath(file.path)

        const cacheData = {
          specs: data,
          name: pipeline.name,
          buffer: folderPath,
          writePath: pipeline.buffer
        }
        const cacheResponse = await savePipelineMutation.mutateAsync(cacheData)

        for (const key in data.pipeline) {
          const block = data.pipeline[key]
          const json = genJSON(block, key)
          editor.addNode_from_JSON(json)
        }

        setPipeline((draft) => {
          draft.name = name
          draft.path = folderPath
          draft.saveTime = Date.now()
          draft.data = data.pipeline
        });
        break;
      }
    }
  };


  const removeFileExtension = (fileName) => {
    return fileName.replace(FILE_EXTENSION_REGEX, "");
  };

  return (
    <div>
      <HeaderMenuItem onClick={selectFile}>Pipeline</HeaderMenuItem>
      <input
        type="file"
        webkitdirectory=""
        directory=""
        ref={fileInput}
        onChange={loadPipeline}
        hidden
      />
    </div>
  );
}
