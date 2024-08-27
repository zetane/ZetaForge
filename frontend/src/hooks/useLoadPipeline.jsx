import { useImmerAtom } from "jotai-immer";
import { trpc } from "@/utils/trpc";
import { getDirectoryPath } from "@/../utils/fileUtils";
import {
  workspaceAtom,
  pipelineFactory,
  pipelineKey,
} from "@/atoms/pipelineAtom";
import { getWsConnection } from "@/client/anvil";

export const useLoadPipeline = () => {
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const savePipelineMutation = trpc.savePipeline.useMutation();

  const loadPipeline = async (file) => {
    console.log("***********Loading pipeline from file:", file);

    let relPath = file.webkitRelativePath;
    relPath = relPath.replaceAll("\\", "/");

    const data = JSON.parse(await new Blob([file]).text());
    const folderPath = getDirectoryPath(file.path);

    const bufferPath = file.path
      ? file.path.replace(/pipeline.json$/, "")
      : `${await window.cache.local()}${data.id}`;
    // Preserve name and id from the loaded data
    const name = data.name ?? "Unnamed Pipeline";
    const id = data.id ?? "pipeline-" + Date.now();

    data["sink"] = folderPath;
    data["build"] = bufferPath;

    const cacheData = {
      specs: data,
      name: name, // Ensure the name is saved
      buffer: folderPath,
      writePath: bufferPath,
    };
    await savePipelineMutation.mutateAsync(cacheData);

    const loadedPipeline = {
      name: name,
      path: folderPath,
      saveTime: Date.now(),
      buffer: bufferPath,
      data: data.pipeline,
      id: id,
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

function removeNullInputsOutputs(obj) {
  // Create an array to store keys to be removed
  const keysToRemove = [];

  // Iterate through all keys in the object
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      // Check if both inputs and outputs are null
      if (value.inputs === null && value.outputs === null) {
        keysToRemove.push(key);
      }
    }
  }

  // Remove the identified keys from the object
  keysToRemove.forEach((key) => {
    delete obj[key];
  });

  return obj;
}

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
      socketUrl = getWsConnection(configuration, `ws/${executionId}`);
    }
    let data = removeNullInputsOutputs(pipelineData?.pipeline);

    const loadedPipeline = {
      name: pipelineData.name ? pipelineData.name : pipelineData.id,
      path: pipelineData.sink ? pipelineData.sink : null,
      saveTime: Date.now(),
      buffer: bufferPath,
      data: data,
      id: pipelineData.id,
      history: pipelineData.id + "/" + executionId,
      record: pipeline,
      socketUrl: socketUrl,
      logs: pipeline?.Log,
    };
    let newPipeline = pipelineFactory(
      await window.cache.local(),
      loadedPipeline,
    );
    // sort keys
    newPipeline = sortSpecsKeys(newPipeline);
    return newPipeline;
  };

  return loadPipeline;
};

export const useLoadCorePipeline = () => {
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const savePipelineMutation = trpc.savePipeline.useMutation();

  const loadPipeline = async (specs, path) => {
    const bufferPath = `${await window.cache.local()}${specs.id}`;

    const cacheData = {
      specs: specs,
      name: specs.name,
      buffer: path,
      writePath: bufferPath,
    };
    await savePipelineMutation.mutateAsync(cacheData);

    const loadedPipeline = {
      name: specs.name,
      saveTime: Date.now(),
      buffer: bufferPath,
      data: specs.pipeline,
      id: specs.id,
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
