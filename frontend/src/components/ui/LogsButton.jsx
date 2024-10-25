import { PipelineLogs } from "./PipelineLogs";
import { Button } from "@carbon/react";
import { CloudLogging } from "@carbon/icons-react";
import { useAtom } from "jotai";
import { modalContentAtom } from "@/atoms/modalAtom";
import { logsAtom } from "@/atoms/logsAtom";
import { useRef } from "react";

export default function LogsButton({ mobile }) {
  const [modalContent, setModalContent] = useAtom(modalContentAtom);
  const [logs, _] = useAtom(logsAtom);
  const buttonRef = useRef(null);

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

  const handleClick = () => {
    if (buttonRef?.current) {
      buttonRef.current.click();
    }
  }
  return (
    <>
      {mobile ? (
        <div className="flex flex-col items-center gap-4 cds--btn p-0 group">
          <Button
            // style={styles}
            className="p-1.5 "
            size="sm"
            kind="tertiary"
            onClick={() =>
              modalPopper(<PipelineLogs logs={logs} title="Pipeline Logs" />)
            }
            ref={buttonRef}
          >
            <CloudLogging size="20"/>
          </Button>
          <span onClick={() => handleClick()}>Log</span>
        </div>
      ) : (
        <Button
          style={styles}
          size="sm"
          kind="tertiary"
          onClick={() =>
            modalPopper(<PipelineLogs logs={logs} title="Pipeline Logs" />)
          }
        >
          Log
          <CloudLogging size="20" style={svgOverride} />
        </Button>
      )}
    </>
  );
}
