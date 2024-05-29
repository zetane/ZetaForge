import { useImmerAtom } from "jotai-immer";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { trpc } from "@/utils/trpc";
import { getDirectoryPath } from "@/../utils/fileUtils";
import { workspaceAtom, pipelineFactory } from "@/atoms/pipelineAtom";

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

    setWorkspace(draft => {
      draft.tabs.push(newPipeline.id)
      draft.pipelines[newPipeline.id] = newPipeline
      draft.active = newPipeline.id
    })
  };

  return loadPipeline;
};

export const useLoadServerPipeline = () => {
  const loadPipeline = (pipeline) => {
    if (!pipeline || !pipeline.record)  { return }
    const record = pipeline.record;
    const pipelineData = JSON.parse(record.PipelineJson)

    // writes from server location to user local cache
    // TODO: make this work, right now this will ONLY WORK FOR LOCAL VERSION
    /*

    data['build'] = bufferPath
    data['sink'] = bufferPath

    const cacheData = {
      specs: data,
      name: data.name,
      buffer: fromPath,
      writePath: bufferPath
    };
    await savePipelineMutation.mutateAsync(cacheData);
    */
    const bufferPath = `${window.cache.local}${pipelineData.id}`;
    const executionId = record.Execution

    const loadedPipeline = {
      name: pipelineData.name ? pipelineData.name : pipelineData.id,
      path: pipelineData.sink ? pipelineData.sink : null,
      saveTime: Date.now(),
      buffer: bufferPath,
      data: pipelineData.pipeline,
      id: pipelineData.id,
      history: pipelineData.id + "/" + executionId,
      record: record
    }

    const newPipeline = pipelineFactory(window.cache.local, loadedPipeline)

    return newPipeline
  };

  return loadPipeline;
};
