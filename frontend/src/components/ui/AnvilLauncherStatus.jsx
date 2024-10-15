import ClosableModal from "./modal/ClosableModal";
import StatusModal from "./modal/StatusModal";
import SystemLogViewer from "./SystemLogViewer";
export default function AnvilLauncherStatus(props) {
  return (
    <>
      <StatusModal
        modalHeading={props.confirmationHeader}
        onRequestSubmit={props.confirmSettings}
        onRequestClose={props.confirmationClose}
        open={props.confirmationOpen}
        message={props.confirmationMessage}
      />

      <StatusModal
        modalHeading={props.errorHeader}
        passiveModal
        onRequestClose={props.errorClose}
        open={props.errorOpen}
        message={props.errorMessage}
      />

      <ClosableModal
        modalHeading={props.logViewerTitle}
        passiveModal={true}
        open={props.logViewerOpen}
        onRequestClose={props.logViewerClose}
        modalClass="custom-modal-size"
      >
        <SystemLogViewer />
      </ClosableModal>
    </>
  );
}
