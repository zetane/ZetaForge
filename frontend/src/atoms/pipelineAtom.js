import { atom } from 'jotai'
import { withImmer } from 'jotai-immer';
import { customAlphabet } from "nanoid";

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
  console.log(defaultPipeline)
  return defaultPipeline
}

const initPipeline = pipelineFactory(window.cache.local)

export const workspaceAtom = atom({
  tabs: [initPipeline.id],
  pipelines: {[initPipeline.id]: initPipeline},
  running() {
    return Object.values(this.pipelines).filter(pipeline => pipeline.record )
  },
  active: initPipeline.id
})

const pipelineAtomWithImmer = atom(
  (get) => {
    const workspace = get(workspaceAtom);
    return workspace.active ? workspace.pipelines[workspace.active] : null;
  },
  (get, set, newPipeline) => {
    const workspace = get(workspaceAtom);
    const newWorkspace = {...workspace};
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
