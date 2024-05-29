import { atom } from 'jotai'
import { withImmer } from 'jotai-immer';
import { customAlphabet } from "nanoid";
import rfdc from 'rfdc';

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

export const workspaceAtom = atom({
  tabs: [initPipeline.id],
  pipelines: {[initPipeline.id]: initPipeline},
  active: initPipeline.id
})

export const getRunning = (workspace) => {
  console.log(workspace)
  let pipelines = []
  if (workspace) {
    pipelines = workspace.pipelines
  }
  return Object.values(pipelines).filter(pipeline => pipeline.record
    && pipeline.record.Status == "Running")
}

const pipelineAtomWithImmer = atom(
  (get) => {
    const workspace = get(workspaceAtom);
    return workspace.active ? workspace.pipelines[workspace.active] : null;
  },
  (get, set, newPipeline) => {
    const workspace = get(workspaceAtom);
    const newWorkspace = rfdc({proto: true})(workspace)
    newWorkspace.pipelines[newPipeline.id] = newPipeline;
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
