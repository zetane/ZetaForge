import { HeaderMenuItem } from "@carbon/react";
import { useRef } from "react";
import { pipelineAtom, getPipelineFormat } from "@/atoms/pipelineAtom";
import { customAlphabet } from "nanoid";
import { useImmerAtom } from 'jotai-immer'
import { useAtom } from "jotai";
import { trpc } from "@/utils/trpc"
import { getDirectoryPath } from "@/../utils/fileUtils";
import { mixpanelAtom } from "@/atoms/mixpanelAtom";

export default function LoadBlockButton() {
  const FILE_EXTENSION_REGEX = /\.[^/.]+$/;
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom)
  const [mixpanelService] = useAtom(mixpanelAtom)

  const fileInput = useRef();

  const selectFile = () => {
    fileInput.current.click();
  };

  const saveBlockMutation = trpc.saveBlock.useMutation();

  const addBlockToPipeline = async (block, path) => {
    const nanoid = customAlphabet('1234567890abcedfghijklmnopqrstuvwxyz', 12)
    const newNanoid = nanoid()
    const id = `${block.information.id}-${newNanoid}`

    const newPipeline = getPipelineFormat(pipeline)
    let newPipelineData = JSON.parse(JSON.stringify(pipeline.data))
    newPipelineData[id] = block
    newPipeline.pipeline = newPipelineData

    const cacheData = {
      pipelineSpec: newPipeline,
      name: pipeline.name,
      blockSpec: block,
      blockId: id,
      blockPath: path,
      pipelinePath: pipeline.buffer
    }
    const res = await saveBlockMutation.mutateAsync(cacheData)

    setPipeline((draft) => {
      draft.data[id] = block;
    })
    return id;
  }

  const getDistinctId = trpc.getDistinctId.useMutation();

  const loadBlock = async (pipeline) => {
    try {
      await mixpanelService.trackEvent('Load Block')
    } catch(err){
        
    }
    const files = fileInput.current.files
    for (const key in files) {
      const file = files[key]
      let relPath = file.webkitRelativePath
      relPath = relPath.replaceAll('\\', '/')
      const name = removeFileExtension(file.name)
      if (name === "specs_v1") {
        const spec = JSON.parse(await (new Blob([file])).text())
        let folderPath = getDirectoryPath(file.path)
        folderPath = folderPath.replaceAll('\\', '/')
        
        await addBlockToPipeline(spec, folderPath)

        fileInput.current.value = ''
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
