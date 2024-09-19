import { compilationErrorToastAtom } from "@/atoms/compilationErrorToast";
import { useAtom } from "jotai";
import CompilationErrorToast from "./blockEditor/directoryViewer/CompliationErrorToast";

export default function ToastWrapper() {
  const [compilationErrorToast, setCompilationErrorToast] = useAtom(
    compilationErrorToastAtom,
  );

  const onClose = () => {
    setCompilationErrorToast(false);
  };

  return (
    <div className="absolute bottom-3 right-3 z-[9000]">
      {compilationErrorToast && <CompilationErrorToast onClose={onClose} />}
    </div>
  );
}
