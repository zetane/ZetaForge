import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { distinctIdAtom } from "@/atoms/distinctIdAtom";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";
import { useRef } from "react";
import { getDirectoryPath } from "@/../utils/fileUtils";
import { useImmerAtom } from "jotai-immer";
import { trpc } from "@/utils/trpc";
//import mixpanel from '@/components/mixpanel'

export default function LoadPipelineButton() {
  const FILE_EXTENSION_REGEX = /\.[^/.]+$/;
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [distinctId, setDistinctId] = useImmerAtom(distinctIdAtom)
  const fileInput = useRef();

  const getDistinctId = trpc.getDistinctId.useMutation();
  const savePipelineMutation = trpc.savePipeline.useMutation()

  const selectFile = () => {
    fileInput.current.click();
  };

  const loadPipeline = async () => {
    let data = distinctId?.distinctId

    if (data === "0" || data === undefined) {
      const res = await getDistinctId.mutateAsync({ distinctId: "0" })

      data = res.distinctId

      setDistinctId((draft) => {
        draft.distinctId = data
      })
    }
    try {
      //mixpanel.track('Load Pipeline', {
      //  'distinct_id': data,
      //})
    } catch (error) {
      //ignore the error, no logs
    }
    const files = fileInput.current.files
    for (const key in files) {
      const file = files[key]
      const folder = file.webkitRelativePath.split("/")[0]
      const name = removeFileExtension(file.name)
      if (folder == name) {
        // We don't need to purge the cache on disk
        // bc the savePipeline call below will 
        const data = JSON.parse(await (new Blob([file])).text())
        const folderPath = getDirectoryPath(file.path)

        const cacheData = {
          specs: data,
          name: data.name,
          buffer: folderPath,
          writePath: pipeline.buffer
        }
        const cacheResponse = await savePipelineMutation.mutateAsync(cacheData)

        // We have to clear the pipeline object first
        // Because otherwise we can have key collisions
        setPipeline((draft) => {
          draft.data = {}
        })

        setPipeline((draft) => {
          draft.name = name
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
