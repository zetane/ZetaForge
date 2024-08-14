import { atom } from "jotai";

const isBlockEditorOpenAtom = atom(false);
const blockEditorIdAtom = atom(null);
export { blockEditorIdAtom, isBlockEditorOpenAtom };
