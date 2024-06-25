import { atomWithStorage } from "jotai/utils";

const darkModeAtom = atomWithStorage("darkMode", true);

export { darkModeAtom };
