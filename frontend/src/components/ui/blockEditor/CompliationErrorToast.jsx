import { ToastNotification } from "@carbon/react";

export default function CompilationErrorToast({ onClose }) {
  return (
    <ToastNotification
      aria-label="closes notification"
      caption="Could not compile the compuations.py file. Execution will fail. Please fix computations.py to enable its excution."
      kind="error"
      onCloseButtonClick={onClose}
      onClose={onClose}
      role="status"
      statusIconDescription="notification"
      timeout={0}
      title="Computations Compilation Failed"
    />
  )
}