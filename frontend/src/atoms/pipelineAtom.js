import { atom } from "jotai";
import { withImmer } from "jotai-immer";
import rfdc from "rfdc";
import { sha1 } from "js-sha1";
import { generateId } from "@/utils/blockUtils";

export const pipelineKey = (id, data) => {
  let hash = "";
  if (data && data != "") {
    hash = sha1(JSON.stringify(data));
  }
  return id + "." + hash;
};

export const pipelineFactory = (cachePath, pipeline = null) => {
  const id = generateId("pipeline");
  const buffer = `${cachePath}${id}`;
  let defaultPipeline = {
    id: id,
    name: id,
    saveTime: null,
    buffer: buffer,
    path: undefined,
    data: {},
    logs: [],
    history: null,
    socketUrl: null,
    record: null,
  };
  if (pipeline) {
    defaultPipeline = Object.assign(defaultPipeline, pipeline);
  }
  return defaultPipeline;
};

const initPipeline = pipelineFactory(await window.cache.local());
const emptyKey = `${initPipeline.id}.`;
const tabMap = {
  [emptyKey]: {},
};

export const workspaceAtom = atom({
  tabs: tabMap,
  pipelines: { [emptyKey]: initPipeline },
  active: emptyKey,
  fetchInterval: 10 * 1000,
  offset: 0,
  limit: 15,
  connected: false,
});

const pipelineAtomWithImmer = atom(
  (get) => {
    const workspace = get(workspaceAtom);
    return workspace.active ? workspace.pipelines[workspace.active] : null;
  },
  (get, set, newPipeline) => {
    const workspace = get(workspaceAtom);
    const newWorkspace = rfdc({ proto: true })(workspace);
    let key = `${newPipeline.id}.`;
    if (newPipeline.record) {
      key = `${newPipeline.id}.${newPipeline.record.Execution}`;
    }
    newWorkspace.pipelines[key] = newPipeline;
    set(workspaceAtom, newWorkspace);
  },
);

export const socketUrlAtom = atom(
  (get) => get(pipelineAtom)?.socketUrl,
  null,
  (prev, next) => prev === next,
);

export const pipelineAtom = withImmer(pipelineAtomWithImmer);

export const getPipelineFormat = (pipeline) => {
  return {
    sink: pipeline.path ? pipeline.path : pipeline.buffer,
    build: pipeline.buffer,
    name: pipeline.name,
    id: pipeline.id,
    pipeline: pipeline.data,
  };
};

export const lineageAtom = atom((get) => {
  console.log("being called");
  const workspace = get(workspaceAtom);
  const lineage = new Map();

  if (!workspace?.pipelines) {
    return lineage;
  }

  // Filter out pipelines with empty .record fields
  const validPipelines = Object.entries(workspace?.pipelines).filter(
    ([_, pipeline]) =>
      pipeline.record && Object.keys(pipeline.record).length > 0,
  );

  const sortedPipelines = validPipelines.sort(([, a], [, b]) =>
    b.record.Execution.localeCompare(a.record.Execution),
  );

  sortedPipelines.forEach((entry) => {
    const pipeline = entry[1];
    const record = pipeline?.record;
    const sha1Hash = record?.Hash;
    if (!record || !sha1Hash) {
      return;
    }
    const pipelineData = JSON.parse(record.PipelineJson);
    const friendlyName = pipelineData.name;
    if (!lineage.has(sha1Hash)) {
      const createDate = new Date(record.Created * 1000);
      lineage.set(sha1Hash, {
        id: pipeline.id,
        name: friendlyName,
        hash: sha1Hash,
        deployed: record.Deployed,
        pipelineData: pipelineData,
        created: createDate.toLocaleString(),
        lastExecution: createDate.toLocaleString(),
        host: pipeline.host,
        executions: new Map(),
      });
    }

    const lineageEntry = lineage.get(sha1Hash);
    const existingExecution = lineageEntry.executions.get(record.Execution);

    if (!existingExecution) {
      const execDate = new Date(record.ExecutionTime * 1000);
      lineageEntry.executions.set(record.Execution, {
        id: record.Execution,
        hash: sha1Hash,
        pipeline: pipeline.id,
        created: execDate.toLocaleString(),
        status: record.Status,
      });
    } else {
      Object.assign(existingExecution, {
        status: pipeline.record.Status,
        created: new Date(
          pipeline.record.ExecutionTime * 1000,
        ).toLocaleString(),
      });
    }

    const mostRecent = Array.from(lineageEntry.executions.values())[0]?.created;
    if (mostRecent) {
      lineageEntry.lastExecution = mostRecent;
    }
  });

  return lineage;
});
