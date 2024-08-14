import { logsAtom } from "@/atoms/logsAtom";
import { LogsCodeMirror } from "@/components/ui/blockEditor/directoryViewer/CodeMirrorComponents";
import { useAtom } from "jotai";
import { useMemo } from "react";
import ScrollToBottom from "react-scroll-to-bottom";
import ClosableModal from "./modal/ClosableModal";

export const isEmpty = (obj) => {
  for (var i in obj) return false;
  return true;
};

export const PipelineLogs = ({ title, filter }) => {
  const [logs, _] = useAtom(logsAtom);

  const sortedLogs = useMemo(() => {
    let result = Array.from(logs?.values()).sort((a, b) =>
      a?.time?.localeCompare(b?.time),
    );
    if (typeof filter === "function") {
      result = result.filter(filter);
    }

    return result;
  }, [logs, filter]);

  const formattedLogs = [];
  sortedLogs.forEach((log) => {
    if (!log?.time) {
      formattedLogs.push(log.message);
      return;
    }
    let logString = `[${log.time}]${log.blockId ? `[${log.blockId}]` : ""} ${log.message}`;
    if (!isEmpty(log.argoLog)) {
      return;
    }
    formattedLogs.push(logString);
  });

  return (
    <ClosableModal
      modalHeading={title}
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

