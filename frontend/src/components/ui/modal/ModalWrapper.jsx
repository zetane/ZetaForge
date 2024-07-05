import { modalContentAtom } from "@/atoms/modalAtom";
import { useAtom } from "jotai";

export default function ModalWrapper() {
  const [modalContent] = useAtom(modalContentAtom);
  return <>{modalContent.content}</>;
}
