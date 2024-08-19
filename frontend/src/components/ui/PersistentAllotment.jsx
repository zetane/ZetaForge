import { Allotment } from "allotment";
import { allotmentSizesAtom } from "@/atoms/allotmentAtom";
import { useImmerAtom } from "jotai-immer";

const storageKeys = {};

export default function PersistentAllotment({ storageKey, initialSize, children, ...rest }) {
  if (storageKeys[storageKey]) {
    console.warn(`PersistentAllotment' storageKey "${storageKey}" has already been used by another component. Did you forget to change the stoageKey?.`);
  }
  storageKeys[storageKey] = true;

  const [allotmentSizes, setAllotmentSizes] = useImmerAtom(allotmentSizesAtom);
  const size = allotmentSizes[storageKey] ?? initialSize;

  const setSize = (size) => {
    setAllotmentSizes((draft) => {
      draft[storageKey] = size;
    });
  };

  return (
    <Allotment defaultSizes={size} onDragEnd={setSize} {...rest}>
      {children}
    </Allotment>
  );
}
