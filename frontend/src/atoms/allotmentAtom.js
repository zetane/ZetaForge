import { atomWithStorage } from "jotai/utils";

export const allotmentSizesAtom = atomWithStorage(
  "allotmentSizes",
  {},
  undefined,
  { getOnInit: true },
);
