import { Modal } from "@carbon/react";
import { ConfirmModalContext } from "./ConfirmModalContext";
import { useContext } from "react";

export default function ConfirmChangeFileModal() {
  const confirmModal = useContext(ConfirmModalContext);

  return (
    <Modal
      modalHeading="Unsaved changes"
      primaryButtonText="Save"
      secondaryButtonText="Discard"
      size="sm"
      open={confirmModal.isOpen}
      onRequestSubmit={confirmModal.save}
      onSecondarySubmit={confirmModal.discard}
      onRequestClose={confirmModal.close}
    >
      If you leave page, any changes you have  made will be lost
    </Modal>
  );
}

