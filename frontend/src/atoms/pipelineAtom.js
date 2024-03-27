import { atom } from "jotai";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet('1234567890abcedfghijklmnopqrstuvwxyz', 12)
const newNanoid = nanoid()
const id = `pipeline-${newNanoid}`

export const pipelineAtom = atom({
  id: id,
  name: null, 
  saveTime: null,
  buffer: null,
  path: undefined,
  data: {},
  log: [],
  history: null,
  socketUrl: null
});

export const getPipelineFormat = (pipeline) => {
  return {
    sink: pipeline.path ? pipeline.path : pipeline.buffer,
    build: pipeline.buffer,
    name: pipeline.name,
    id: pipeline.id,
    pipeline: pipeline.data
  }
}