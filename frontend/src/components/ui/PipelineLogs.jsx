import { LogsCodeMirror } from "@/components/ui/blockEditor/CodeMirrorComponents";
import ClosableModal from "./modal/ClosableModal";
import ScrollToBottom from "react-scroll-to-bottom";
import { logsAtom } from "@/atoms/logsAtom";
import { useAtom } from "jotai";
import { useMemo } from "react";

const isEmpty = (obj) => {
  for (var i in obj) return false;
  return true;
};

export const PipelineLogs = () => {
  const [logs, _] = useAtom(logsAtom);

  const sortedLogs = useMemo(() => {
    return Array.from(logs.values()).sort((a, b) =>
      a.time.localeCompare(b.time),
    );
  }, [logs]);

  const formattedLogs = [];
  sortedLogs.forEach((log) => {
    let logString = `[${log.time}]${log.blockId ? `[${log.blockId}]` : ""} ${log.message}`;
    if (!isEmpty(log.argoLog)) {
      return;
    }
    if (!isEmpty(log.event)) {
    }
    formattedLogs.push(logString);
  });

  return (
    <ClosableModal
      modalHeading="Pipeline Logs"
      passiveModal={true}
      modalClass="custom-modal-size"
    >
      <ScrollToBottom className="viewer-container">
        <div className="logs-viewer">
          <LogsCodeMirror code={formattedLogs.join("\n")} />
        </div>
      </ScrollToBottom>
    </ClosableModal>
  );
};
