import { atom } from "jotai";
import { withImmer } from "jotai-immer";
import { customAlphabet } from "nanoid";
import rfdc from "rfdc";
import { sha1 } from "js-sha1";

export const pipelineKey = (id, data) => {
  let hash = "";
  if (data && data != "") {
    hash = sha1(JSON.stringify(data));
  }
  return id + "." + hash;
};

export const pipelineFactory = (cachePath, pipeline = null) => {
  const nanoid = customAlphabet("1234567890abcedfghijklmnopqrstuvwxyz", 12);
  const newNanoid = nanoid();
  const id = `pipeline-${newNanoid}`;
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
  const workspace = get(workspaceAtom);

  // Filter out pipelines with empty .record fields
  const validPipelines = Object.values(workspace.pipelines).filter(
    (pipeline) => pipeline.record,
  );
  const sortedPipelines = validPipelines.sort(([, a], [, b]) =>
    b.record.Execution.localeCompare(a.record.Execution),
  );

  const lineage = new Map();

  Object.values(sortedPipelines).forEach((pipeline) => {
    const record = pipeline?.record;
    const sha1Hash = record?.Hash;
    if (!record || !sha1Hash) {
      return;
    }
    const pipelineData = JSON.parse(record.PipelineJson);
    const friendlyName = pipelineData.name;
    if (!lineage.has(sha1Hash)) {
      lineage.set(sha1Hash, {
        id: pipeline.id,
        name: friendlyName,
        hash: sha1Hash,
        deployed: record.Deployed,
        executions: new Map(),
      });
    }

    const lineageEntry = lineage.get(sha1Hash);
    const existingExecution = lineageEntry.executions.get(record.Execution);

    if (!existingExecution) {
      lineageEntry.executions.set(record.Execution, {
        id: record.Execution,
        hash: sha1Hash,
        pipeline: pipeline.id,
        created: new Date(record.ExecutionTime * 1000).toLocaleString(),
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
  });

  return lineage;
});
