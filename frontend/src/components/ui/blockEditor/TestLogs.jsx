import { trpc } from "@/utils/trpc";
import { PlayFilled } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogsCodeMirror } from "./CodeMirrorComponents";

const LogsViewer = ({ filePath, blockPath, blockKey }) => {
  const [logs, setLogs] = useState("");
  const [stickBottom, setStickBottom] = useState(false);
  const logsDiv = useRef(null);
  const serverAddress = "http://localhost:3330";
  const [isRunButtonPressed, setIsRunButtonPressed] = useState(false);

  const runTest = trpc.runTest.useMutation();

  useEffect(() => {
    let interval;

    if (isRunButtonPressed) {
      interval = setInterval(() => {
        fetch(`${serverAddress}/api/logs?filePath=${filePath}`)
          .then((response) => response.text())
          .then((data) => {
            setStickBottom(isAtBottom())
            setLogs(data)
          })
          .catch((err) => console.error(err));
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [filePath, isRunButtonPressed]);

  const isAtBottom = () => {
    return logsDiv.current.scrollHeight - logsDiv.current.scrollTop - logsDiv.current.clientHeight < 100;
  }

  const scrollToBottom = () => {
    if (stickBottom) {
      logsDiv.current.scrollTo({ lef: 0, top: logsDiv.current.scrollHeight, behavior: "smooth" });
    }
  }

  const handleDockerCommands = useCallback(async () => {
    setIsRunButtonPressed(true);
    runTest.mutateAsync({ blockPath: blockPath, blockKey: blockKey });
  }, [blockKey, blockPath]);

  return (
    <>
      <Button
        renderIcon={PlayFilled}
        iconDescription="Run test"
        tooltipPosition="bottom"
        size="sm"
        onClick={handleDockerCommands}
        title="Run test from this block folder"
        style={{ marginBottom: '20px' }}
      >
        Run Test
      </Button>
      <div ref={logsDiv} className="overflow-y-scroll max-h-full">
        <LogsCodeMirror code={logs} onUpdate={scrollToBottom} />
      </div>
    </>
  );
};

export default LogsViewer;
