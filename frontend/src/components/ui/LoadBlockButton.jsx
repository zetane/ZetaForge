import { HeaderMenuItem } from "@carbon/react";
import { useRef } from "react";
import { pipelineAtom, getPipelineFormat } from "@/atoms/pipelineAtom";
import { customAlphabet } from "nanoid";
import { distinctIdAtom } from "@/atoms/distinctIdAtom";
import { useImmerAtom } from 'jotai-immer'
import { trpc } from "@/utils/trpc"
import { getDirectoryPath } from "@/../utils/fileUtils";
//import mixpanel from '@/components/mixpanel'

export default function LoadBlockButton() {
  const FILE_EXTENSION_REGEX = /\.[^/.]+$/;
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom)
  const [distinctId, setDistinctId] = useImmerAtom(distinctIdAtom)

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
    let data = distinctId?.distinctId

    if (data === "0" || data === undefined) {

      const res = await getDistinctId.mutateAsync({ distinctId: "0" }) //ignore the input, it'll just mutate the new distinct id

      data = res.distinctId

      setDistinctId((draft) => {
        draft.distinctId = data
      })
    } try {
      //mixpanel.track('Load Block', {
      //  'distinct_id': data,
      //})
    } catch (error) {
      //ignore the error, no logs
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
