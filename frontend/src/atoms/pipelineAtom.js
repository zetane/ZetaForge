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
  lineage: new Map(),
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
