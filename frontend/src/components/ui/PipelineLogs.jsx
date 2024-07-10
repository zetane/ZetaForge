import { LogsCodeMirror } from "@/components/ui/blockEditor/CodeMirrorComponents";
import ClosableModal from "./modal/ClosableModal";
import ScrollToBottom from "react-scroll-to-bottom";
import { logsAtom } from "@/atoms/logsAtom";
import { useAtom } from "jotai";
import { useMemo } from "react";

export const PipelineLogs = () => {
  const [logs, _] = useAtom(logsAtom);

  const sortedLogs = useMemo(() => {
    return Array.from(logs.values()).sort((a, b) =>
      a.time.localeCompare(b.time),
    );
  }, [logs]);

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
          <LogsCodeMirror code={sortedLogs.map(formatLogEntry).join("\n")} />
        </div>
      </ScrollToBottom>
    </ClosableModal>
  );
};
