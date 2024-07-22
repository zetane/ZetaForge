import { PipelineLogs } from "./PipelineLogs";
import { Button } from "@carbon/react";
import { CloudLogging } from "@carbon/icons-react";
import { useAtom } from "jotai";
import { modalContentAtom } from "@/atoms/modalAtom";
import { logsAtom } from "@/atoms/logsAtom";

export default function LogsButton() {
  const [modalContent, setModalContent] = useAtom(modalContentAtom);
  const [logs, _] = useAtom(logsAtom);

  const modalPopper = (content) => {
    setModalContent({
      ...modalContent,
      show: true,
      content: content,
    });
  };

  const styles = {
    margin: "5px",
  };

  const svgOverride = { position: "absolute", right: "15px", top: "5px" };
  return (
    <Button
      style={styles}
      size="sm"
      kind="secondary"
      onClick={() =>
        modalPopper(<PipelineLogs logs={logs} title="Pipeline Logs" />)
      }
    >
      Log
      <CloudLogging size="20" style={svgOverride} />
    </Button>
  );
}
