import { useImmerAtom } from "jotai-immer";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { pipelineConnectionsAtom } from "@/atoms/pipelineConnectionsAtom";
import { trpc } from "@/utils/trpc";
import { getDirectoryPath } from "@/../utils/fileUtils";
import { customAlphabet } from 'nanoid';
import { createConnections } from "@/utils/createConnections"
import { useAtom } from "jotai";

export const useLoadPipeline = () => {
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [pipelineConnections, setPipelineConnections] = useAtom(pipelineConnectionsAtom);
  const savePipelineMutation = trpc.savePipeline.useMutation();
  const cacheQuery = trpc.getCachePath.useQuery();
  const cachePath = cacheQuery?.data || "";

  const loadPipeline = async (file) => {
    console.log("***********Loading pipeline from file:", file);

    const FILE_EXTENSION_REGEX = /\.[^/.]+$/;
    let relPath = file.webkitRelativePath;
    relPath = relPath.replaceAll('\\', '/');
    const folder = relPath.split("/")[0];
    const pipelineName = file.name.replace(FILE_EXTENSION_REGEX, "");

    console.log("Folder:", folder, "Pipeline Name:", pipelineName);

    const data = JSON.parse(await (new Blob([file])).text());

    const folderPath = getDirectoryPath(file.path);
    console.log("Folder path:", folderPath);

    // Clear the pipeline object first to avoid key collisions
    const nanoid = customAlphabet('1234567890abcedfghijklmnopqrstuvwxyz', 12);
    const name = `pipeline-${nanoid()}`;
    const bufferPath = `${cachePath}${name}`;

    console.log("Setting initial pipeline state");
    setPipeline(draft => {
      draft.id = name;
      draft.name = name;
      draft.saveTime = null;
      draft.buffer = bufferPath;
      draft.path = undefined;
      draft.data = {};
    });

    const cacheData = {
      specs: data,
      name: data.name,
      buffer: folderPath,
      writePath: bufferPath
    };
    await savePipelineMutation.mutateAsync(cacheData);

    console.log("Setting final pipeline state");
    setPipeline(draft => {
      draft.name = pipelineName;
      draft.path = folderPath;
      draft.saveTime = Date.now();
      draft.data = data.pipeline;
      draft.id = data.id;

      setPipelineConnections(createConnections(data.pipeline))
    });
    
  };

  return loadPipeline;
};
