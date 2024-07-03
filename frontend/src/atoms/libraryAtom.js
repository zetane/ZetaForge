import { atomWithStorage } from "jotai/utils";

const libraryAtom = atomWithStorage("showLibrary", true);

export { libraryAtom };
