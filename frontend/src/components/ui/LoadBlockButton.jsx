import { getDirectoryPath } from "@/../utils/fileUtils";
import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { mixpanelAtom } from "@/atoms/mixpanelAtom";
import { getPipelineFormat, pipelineAtom } from "@/atoms/pipelineAtom";
import { trpc } from "@/utils/trpc";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";
import { useImmerAtom } from 'jotai-immer';
import { customAlphabet } from "nanoid";
import { useRef } from "react";

export default function LoadBlockButton() {
  const FILE_EXTENSION_REGEX = /\.[^/.]+$/;
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom)
  const [mixpanelService] = useAtom(mixpanelAtom)
  const [editor] = useAtom(drawflowEditorAtom)

  const fileInput = useRef();

  const selectFile = () => {
    fileInput.current.click();
  };

  const saveBlockMutation = trpc.saveBlock.useMutation();

  const addBlockToPipeline = async (block, path) => {
    const nanoid = customAlphabet('1234567890abcedfghijklmnopqrstuvwxyz', 12)
    const newNanoid = nanoid()
    const id = `${block.information.id}-${newNanoid}`

    block = centerBlockPosition(block)
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


  const loadBlock = async (pipeline) => {
    try {
      mixpanelService.trackEvent('Load Block')
    } catch (err) {

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

  const centerBlockPosition = (block) => {
    block.views.node.pos_x = ((editor.precanvas.clientWidth / 2) - editor.precanvas.getBoundingClientRect().x) / editor.zoom;
    block.views.node.pos_y = ((editor.precanvas.clientHeight / 2) - editor.precanvas.getBoundingClientRect().y) / editor.zoom;
    return block;
  }

  const removeFileExtension = (fileName) => {
    return fileName.replace(FILE_EXTENSION_REGEX, "");
  };

  return (
    <div>
      <HeaderMenuItem onClick={selectFile}>Load Block</HeaderMenuItem>
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
