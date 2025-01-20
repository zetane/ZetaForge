import { atom } from "jotai";

const compilationErrorToastAtom = atom({
  show: false,
  title: "",
  caption: "",
});

export { compilationErrorToastAtom };
