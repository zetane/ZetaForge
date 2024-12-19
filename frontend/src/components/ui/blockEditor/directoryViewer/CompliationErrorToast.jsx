import { ToastNotification } from "@carbon/react";

export default function ({ title, caption, onClose }) {
  return (
    <ToastNotification
      aria-label="closes notification"
      caption={caption}
      kind="error"
      onCloseButtonClick={onClose}
      onClose={onClose}
      role="status"
      statusIconDescription="notification"
      timeout={0}
      title={title}
    />
  );
}
