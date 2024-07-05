import { LogsCodeMirror } from "@/components/ui/blockEditor/CodeMirrorComponents";
import ClosableModal from "./modal/ClosableModal";
import ScrollToBottom from "react-scroll-to-bottom";
import { useUnifiedLogs } from "@/hooks/useUnifiedLogs";

export const PipelineLogs = () => {
  const { logs, isWebSocketConnected } = useUnifiedLogs();

  const formatLogEntry = (log) =>
    `[${log.time}]${log.blockId ? `[${log.blockId}]` : ""} ${log.message}`;

  return (
    <ClosableModal
      modalHeading="Pipeline Logs"
      passiveModal={true}
      modalClass="custom-modal-size"
    >
      <ScrollToBottom className="viewer-container">
        <div className="logs-viewer">
          <LogsCodeMirror code={logs.map(formatLogEntry).join("\n")} />
        </div>
      </ScrollToBottom>
    </ClosableModal>
  );
};
