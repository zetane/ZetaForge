import { atom } from 'jotai'
import { withImmer } from 'jotai-immer';
import { customAlphabet } from "nanoid";
import rfdc from 'rfdc';
import { hex_sha1 } from '@/utils/sha1';

export const pipelineKey = (id, data) => {
  let hash = ""
  if (data && data != "") {
    hash = hex_sha1(JSON.stringify(data))
  }
  return id + "." + hash
}

export const pipelineFactory = (cachePath, pipeline=null) => {
  const nanoid = customAlphabet('1234567890abcedfghijklmnopqrstuvwxyz', 12)
  const newNanoid = nanoid()
  const id = `pipeline-${newNanoid}`
  const buffer = `${cachePath}${id}`
  let defaultPipeline = {
    id: id,
    name: id,
    saveTime: null,
    buffer: buffer,
    path: undefined,
    data: {},
    log: [],
    history: null,
    socketUrl: null,
    record: null
  }
  if (pipeline) {
    defaultPipeline = Object.assign(defaultPipeline, pipeline)
  }
  return defaultPipeline
}

const initPipeline = pipelineFactory(window.cache.local)
const emptyKey = `${initPipeline.id}.`

export const workspaceAtom = atom({
  tabs: [emptyKey],
  pipelines: {[emptyKey]: initPipeline},
  executions: {},
  active: emptyKey,
  fetchInterval: 10 * 1000
})

export const getRunning = (workspace) => {
  const running = [];
  for (const [key, pipeline] of Object.entries(workspace.executions)) {
    if (pipeline.record.Status == "Running") {
      running.push(pipeline)
    }
  }
  return running
}

const pipelineAtomWithImmer = atom(
  (get) => {
    const workspace = get(workspaceAtom);
    return workspace.active ? workspace.pipelines[workspace.active] : null;
  },
  (get, set, newPipeline) => {
    const workspace = get(workspaceAtom);
    const newWorkspace = rfdc({proto: true})(workspace)
    let key = `${newPipeline.id}.`
    if (newPipeline.record) {
      key = pipelineKey(newPipeline.id, newPipeline.record.Hash)
    }
    newWorkspace.pipelines[key] = newPipeline;
    set(workspaceAtom, newWorkspace)
  }
);

export const pipelineAtom = withImmer(pipelineAtomWithImmer);

export const getPipelineFormat = (pipeline) => {
  return {
    sink: pipeline.path ? pipeline.path : pipeline.buffer,
    build: pipeline.buffer,
    name: pipeline.name,
    id: pipeline.id,
    pipeline: pipeline.data
  }
}
