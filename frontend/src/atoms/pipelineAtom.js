import { atom } from "jotai";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet('1234567890abcedfghijklmnopqrstuvwxyz', 12)
const newNanoid = nanoid()

const pipelineAtom = atom({
  id: newNanoid,
  name: null, 
  saveTime: null,
  buffer: null,
  path: undefined,
  data: {},
  log: [],
  history: null,
  socketUrl: null
});

export { pipelineAtom };
