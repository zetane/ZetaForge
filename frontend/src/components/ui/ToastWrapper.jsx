import { compilationErrorToastAtom } from "@/atoms/compilationErrorToast";
import { useAtom } from "jotai";
import CompilationErrorToast from "./blockEditor/directoryViewer/CompliationErrorToast";

export default function ToastWrapper() {
  const [compilationErrorToast, setCompilationErrorToast] = useAtom(
    compilationErrorToastAtom,
  );

  const onClose = () => {
    setCompilationErrorToast({ show: false, title: "", caption: "" });
  };

  const setToastContent = (title, caption) => {
    setCompilationErrorToast({ show: true, title, caption });
  };

  return (
    <div className="absolute bottom-3 right-3 z-[9000]">
      {compilationErrorToast.show && (
        <CompilationErrorToast
          onClose={onClose}
          title={compilationErrorToast.title}
          caption={compilationErrorToast.caption}
          setToastContent={setToastContent}
        />
      )}
    </div>
  );
}
