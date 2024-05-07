import { atom } from "jotai";
import { customAlphabet } from "nanoid";

export const pipelineAtom = atom({
      id: null,
      name: null,
      saveTime: null,
      buffer: null,
      path: undefined,
      data: {},
      log: [],
      history: null,
      socketUrl: null
 });

export const pipelineFactory = (cachePath) => {
  const nanoid = customAlphabet('1234567890abcedfghijklmnopqrstuvwxyz', 12)
  const newNanoid = nanoid()
  const id = `pipeline-${newNanoid}`
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
    socketUrl: null
  }
}

export const getPipelineFormat = (pipeline) => {
  return {
    sink: pipeline.path ? pipeline.path : pipeline.buffer,
    build: pipeline.buffer,
    name: pipeline.name,
    id: pipeline.id,
    pipeline: pipeline.data
  }
}