import { atom } from "jotai";
import { nanoid } from 'nanoid'

const name = `_pipeline-${nanoid()}`

const pipelineAtom = atom({
  name: name, 
  saveTime: null,
  buffer: `${import.meta.env.VITE_CACHE_DIR}/${name}/`,
  path: undefined
});

export { pipelineAtom };
