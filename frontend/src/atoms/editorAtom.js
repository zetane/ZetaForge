import { atom } from "jotai";

const isBlockEditorOpenAtom = atom(false);
const blockEditorRootAtom = atom(null);
export { blockEditorRootAtom, isBlockEditorOpenAtom };
