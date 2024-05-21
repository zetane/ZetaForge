import { atom } from 'jotai'
import { customAlphabet } from "nanoid";

export const pipelineFactory = (cachePath, id=null) => {
  if (!id) {
    const nanoid = customAlphabet('1234567890abcedfghijklmnopqrstuvwxyz', 12)
    const newNanoid = nanoid()
    id = `pipeline-${newNanoid}`
  }
  const buffer = `${cachePath}${id}`
  return {
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
}

const initPipeline = pipelineFactory(window.cache.local)

export const workspaceAtom = atom({
  pipelines: {[initPipeline.id]: initPipeline},
  running() {
    return Object.values(this.pipelines).filter(pipeline => pipeline.record &&
      pipeline.record.Status == "Running")
  },
  active: initPipeline.id
})

export const pipelineAtom = atom((get) => {
  const workspace = get(workspaceAtom)
  return workspace.active ? workspace.pipelines[workspace.active] : null
})

export const getPipelineFormat = (pipeline) => {
  return {
    sink: pipeline.path ? pipeline.path : pipeline.buffer,
    build: pipeline.buffer,
    name: pipeline.name,
    id: pipeline.id,
    pipeline: pipeline.data
  }
}
