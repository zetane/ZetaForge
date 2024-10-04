//This is a modal that's used for refactoring Confirmation and Error modals that we use throughout the modal while launching anvil locally

import ClosableModal from "./ClosableModal";

export default function StatusModal(props) {
  const modalFactory = () => {
    return (
      <ClosableModal
        modalHeading={props.modalHeading}
        size="md"
        primaryButtonText="Yes"
        secondaryButtonText="No"
        onRequestSubmit={props?.onRequestSubmit}
        onRequestClose={props?.onRequestClose}
        open={props.open}
        passiveModal={props?.passiveModal}
      >
        <div className="flex flex-col gap-4 p-3">
          {props?.message.map((error, i) => {
            return <p key={"error-msg-" + i}>{error}</p>;
          })}
        </div>
      </ClosableModal>
    );
  };

  const modal = modalFactory();
  return modal;
}
