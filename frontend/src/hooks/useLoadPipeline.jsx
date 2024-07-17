import { useImmerAtom } from "jotai-immer";
import { trpc } from "@/utils/trpc";
import { getDirectoryPath } from "@/../utils/fileUtils";
import {
  workspaceAtom,
  pipelineFactory,
  pipelineKey,
} from "@/atoms/pipelineAtom";

export const useLoadPipeline = () => {
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const savePipelineMutation = trpc.savePipeline.useMutation();

  const loadPipeline = async (file) => {
    console.log("***********Loading pipeline from file:", file);

    const FILE_EXTENSION_REGEX = /\.[^/.]+$/;
    let relPath = file.webkitRelativePath;
    relPath = relPath.replaceAll("\\", "/");
    const folder = relPath.split("/")[0];
    const pipelineName = file.name.replace(FILE_EXTENSION_REGEX, "");

    const data = JSON.parse(await new Blob([file]).text());
    const folderPath = getDirectoryPath(file.path);

    // Clear the pipeline object first to avoid key collisions
    const bufferPath = `${await window.cache.local()}${data.id}`;

    data["sink"] = folderPath;
    data["build"] = bufferPath;

    const cacheData = {
      specs: data,
      name: data.name,
      buffer: folderPath,
      writePath: bufferPath,
    };
    await savePipelineMutation.mutateAsync(cacheData);

    const loadedPipeline = {
      name: data.name,
      path: folderPath,
      saveTime: Date.now(),
      buffer: bufferPath,
      data: data.pipeline,
      id: data.id,
    };

    const newPipeline = pipelineFactory(
      await window.cache.local(),
      loadedPipeline,
    );
    const key = pipelineKey(newPipeline.id, null);

    setWorkspace((draft) => {
      draft.tabs[key] = {};
      draft.pipelines[key] = newPipeline;
      draft.active = key;
    });
  };

  return loadPipeline;
};

function sortSpecsKeys(pipeline) {
  const updatedPipeline = {};
  const specs = pipeline?.data ?? [];

  for (const blockId in specs) {
    const block = specs[blockId];
    const inputs = block.inputs;
    const outputs = block.outputs;

    let inputKeys = Object.keys(inputs);
    let outputKeys = Object.keys(outputs);

    if (block.views?.node?.order) {
      const order = block.views.node.order;

      if (
        order?.input?.length === inputKeys.length &&
        order?.output?.length === outputKeys.length
      ) {
        inputKeys = order.input;
        outputKeys = order.output;
      }
    }

    const sortedInputs = {};
    inputKeys.forEach((key) => {
      sortedInputs[key] = inputs[key];
    });

    const sortedOutputs = {};
    outputKeys.forEach((key) => {
      sortedOutputs[key] = outputs[key];
    });

    updatedPipeline[blockId] = {
      ...block,
      inputs: sortedInputs,
      outputs: sortedOutputs,
    };
  }

  pipeline.data = updatedPipeline;
  return pipeline;
}

export const useLoadServerPipeline = () => {
  const loadPipeline = async (pipeline, configuration) => {
    if (!pipeline) {
      return;
    }
    let pipelineData = JSON.parse(pipeline.PipelineJson);
    if (pipeline.Results != "") {
      pipelineData = JSON.parse(pipeline.Results);
    }
    const bufferPath = `${await window.cache.local()}${pipelineData.id}`;
    const executionId = pipeline.Execution;
    let socketUrl = null;
    if (pipeline.Status == "Pending" || pipeline.Status == "Running") {
      socketUrl = `ws://${configuration.anvil.host}:${configuration.anvil.port}/ws/${executionId}`;
    }

    const loadedPipeline = {
      name: pipelineData.name ? pipelineData.name : pipelineData.id,
      path: pipelineData.sink ? pipelineData.sink : null,
      saveTime: Date.now(),
      buffer: bufferPath,
      data: pipelineData.pipeline,
      id: pipelineData.id,
      history: pipelineData.id + "/" + executionId,
      record: pipeline,
      socketUrl: socketUrl,
      logs: pipeline?.Log,
    };
    let newPipeline = pipelineFactory(await window.cache.local(), loadedPipeline);
    // sort keys
    newPipeline = sortSpecsKeys(newPipeline);
    return newPipeline;
  };

  return loadPipeline;
};
