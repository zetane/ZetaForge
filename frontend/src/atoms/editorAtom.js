import { atom } from "jotai";

const isBlockEditorOpenAtom = atom(false);
const blockEditorRootAtom = atom(null);
const splitPanelSizeAtom = atom(
  {
    file: [15, 85],
    directory: [50, 50]
  }
)
export { blockEditorRootAtom, isBlockEditorOpenAtom, splitPanelSizeAtom };
