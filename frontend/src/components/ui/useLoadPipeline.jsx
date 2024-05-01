import { useImmerAtom } from "jotai-immer";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { trpc } from "@/utils/trpc";
import { getDirectoryPath } from "@/../utils/fileUtils";
import { customAlphabet } from 'nanoid';

export const useLoadPipeline = () => {
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
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

    const data = JSON.parse(await (new Blob([file])).text());
    const folderPath = getDirectoryPath(file.path);

    // Clear the pipeline object first to avoid key collisions
    const nanoid = customAlphabet('1234567890abcedfghijklmnopqrstuvwxyz', 12);
    const name = `pipeline-${nanoid()}`;
    const bufferPath = `${cachePath}${name}`;

    setPipeline(draft => {
      draft.id = name;
      draft.name = name;
      draft.saveTime = null;
      draft.buffer = bufferPath;
      draft.path = undefined;
      draft.data = {};
    });

    // set the specs to have the proper history path
    // and to fetch the blocks from the correct dir
    data['sink'] = folderPath
    data['build'] = bufferPath

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
    });
  };

  return loadPipeline;
};
