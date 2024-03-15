import { atom } from "jotai";

const pipelineAtom = atom({
  name: null, 
  saveTime: null,
  //buffer: `${import.meta.env.VITE_CACHE_DIR}/${name}/`,
  buffer: null,
  path: undefined,
  data: {},
  log: [],
  history: null
});

export { pipelineAtom };
