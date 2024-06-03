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

export const useLoadServerPipeline = () => {
  const loadPipeline = (pipeline) => {
    if (!pipeline)  { return }
    console.log(pipeline)
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
      record: pipeline
    }

    const newPipeline = pipelineFactory(window.cache.local, loadedPipeline)

    return newPipeline
  };

  return loadPipeline;
};
