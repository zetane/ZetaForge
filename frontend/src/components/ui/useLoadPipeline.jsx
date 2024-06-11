import { useImmerAtom } from "jotai-immer";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { trpc } from "@/utils/trpc";
import { getDirectoryPath } from "@/../utils/fileUtils";
import { workspaceAtom, pipelineFactory, pipelineKey } from "@/atoms/pipelineAtom";

export const useLoadPipeline = () => {
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const savePipelineMutation = trpc.savePipeline.useMutation();

  const loadPipeline = async (file) => {
    console.log("***********Loading pipeline from file:", file);

    const FILE_EXTENSION_REGEX = /\.[^/.]+$/;
    let relPath = file.webkitRelativePath;
    relPath = relPath.replaceAll('\\', '/');
    const folder = relPath.split("/")[0];
    const pipelineName = file.name.replace(FILE_EXTENSION_REGEX, "");

    const data = JSON.parse(await (new Blob([file])).text());
    const folderPath = getDirectoryPath(file.path);

    // Clear the pipeline object first to avoid key collisions
    const bufferPath = `${window.cache.local}${data.id}`;

    data['sink'] = folderPath
    data['build'] = bufferPath

    const cacheData = {
      specs: data,
      name: data.name,
      buffer: folderPath,
      writePath: bufferPath
    };
    await savePipelineMutation.mutateAsync(cacheData);

    const loadedPipeline = {
      name: data.name,
      path: folderPath,
      saveTime: Date.now(),
      buffer: bufferPath,
      data: data.pipeline,
      id: data.id
    }

    const newPipeline = pipelineFactory(window.cache.local, loadedPipeline)
    const key = pipelineKey(newPipeline.id, null)

    setWorkspace(draft => {
      draft.tabs.push(key)
      draft.pipelines[key] = newPipeline
      draft.active = key
    })
  };

  return loadPipeline;
};

function updatePipelineWithLogFile(pipeline) {
  for (const line of pipeline.logs) {
   if (line.trim() !== '') {
     const { executionId, blockId, message, time, ...jsonObj } = JSON.parse(line);
     let shouldLog = true;

     if (pipeline.data[blockId]) {
       const node = pipeline.data[blockId];
       const tagAndObject = message.split("|||");
       const tag = tagAndObject[0].trim();

       if (tag === "debug") {
         shouldLog = false;
       }

       if (tag === "outputs") {
         try {
           const outs = JSON.parse(tagAndObject[1]);
           if (outs && typeof outs === 'object') {
             for (const [key, value] of Object.entries(outs)) {
               if (!node.events.outputs) {
                 node.events["outputs"] = {};
               }
               node.events.outputs[key] = value;
             }
           }
         } catch (err) {
           console.error('Failed to parse outputs:', err);
         }
       }

       if (tag === "inputs") {
         try {
           const outs = JSON.parse(tagAndObject[1]);
           if (outs && typeof outs === 'object') {
             for (const [key, value] of Object.entries(outs)) {
               if (!node.events.inputs) {
                 node.events["inputs"] = {};
               }
               node.events["inputs"][key] = value;
             }
           }
         } catch (err) {
           console.error('Failed to parse inputs:', err);
         }
       }
     }

     if (shouldLog) {
       let logString = `[${time}][${executionId}] ${message}`;
       if (blockId) {
         logString = `[${time}][${executionId}][${blockId}] ${message}`;
       }
       pipeline.log.push(logString);
     }
   }
 }

 return pipeline;
}

export const useLoadServerPipeline = () => {
  const loadPipeline = (pipeline) => {
    if (!pipeline)  { return }
    const pipelineData = JSON.parse(pipeline.PipelineJson)
    const bufferPath = `${window.cache.local}${pipelineData.id}`;
    const executionId = pipeline.Execution

    const loadedPipeline = {
      name: pipelineData.name ? pipelineData.name : pipelineData.id,
      path: pipelineData.sink ? pipelineData.sink : null,
      saveTime: Date.now(),
      buffer: bufferPath,
      data: pipelineData.pipeline,
      id: pipelineData.id,
      history: pipelineData.id + "/" + executionId,
      record: pipeline,
      socketUrl: `${import.meta.env.VITE_WS_EXECUTOR}/ws/${executionId}}`,
      logs: pipeline.Log
    }

    let newPipeline = pipelineFactory(window.cache.local, loadedPipeline)
    if (newPipeline.logs != null && newPipeline.logs.length) {
      try {
        newPipeline = updatePipelineWithLogFile(newPipeline)
        console.log("made it: ", newPipeline)
      } catch (e) {
        console.log("Failed to parse server logs: ", e)
      }
    }

    console.log("new pipeline: ", newPipeline)

    return newPipeline
  };

  return loadPipeline;
};
