import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { distinctIdAtom } from "@/atoms/distinctIdAtom";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";
import { useRef } from "react";
import { getDirectoryPath } from "@/../utils/fileUtils";
import { useImmerAtom } from "jotai-immer";
import { trpc } from "@/utils/trpc";
import { customAlphabet } from 'nanoid'
//import mixpanel from '@/components/mixpanel'

export default function LoadPipelineButton() {
  const FILE_EXTENSION_REGEX = /\.[^/.]+$/;
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [distinctId, setDistinctId] = useImmerAtom(distinctIdAtom)
  const fileInput = useRef();

  const getDistinctId = trpc.getDistinctId.useMutation();
  const savePipelineMutation = trpc.savePipeline.useMutation()
  const cacheQuery = trpc.getCachePath.useQuery();
  const cachePath = cacheQuery?.data || ""

  const selectFile = () => {
    fileInput.current.click();
  };

  const loadPipeline = async () => {
    let userId = distinctId?.distinctId
    if (userId === "0" || userId === undefined) {
      const res = await getDistinctId.mutateAsync({ distinctId: "0" })
      userId = res.distinctId

      setDistinctId((draft) => {
        draft.distinctId = userId
      })
    }
    try {
      //mixpanel.track('Load Pipeline', {
      //  'distinct_id': userId,
      //})
    } catch (error) {
      //ignore the error, no logs
    }
    const files = fileInput.current.files
    for (const key in files) {
      const file = files[key]
      let relPath = file.webkitRelativePath
      relPath = relPath.replaceAll('\\', '/')
      const folder = relPath.split("/")[0]
      const pipelineName = removeFileExtension(file.name)
      if (folder == pipelineName) {
        // We don't need to purge the cache on disk
        // bc the savePipeline call below will 
        const data = JSON.parse(await (new Blob([file])).text())
        const folderPath = getDirectoryPath(file.path)

        // We have to clear the pipeline object first
        // Because otherwise we can have key collisions
        const nanoid = customAlphabet('1234567890abcedfghijklmnopqrstuvwxyz', 12)
        const name = `pipeline-${nanoid()}`
        const bufferPath = `${cachePath}${name}`
        setPipeline((draft) => {
          draft.id = name,
          draft.name = name,
          draft.saveTime = null,
          draft.buffer = bufferPath,
          draft.path = undefined,
          draft.data = {}
        })

        const cacheData = {
          specs: data,
          name: data.name,
          buffer: folderPath,
          writePath: bufferPath
        }
        const cacheResponse = await savePipelineMutation.mutateAsync(cacheData)

        setPipeline((draft) => {
          draft.name = pipelineName
          draft.path = folderPath
          draft.saveTime = Date.now()
          draft.data = data.pipeline
          draft.id = data.id
        });

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
