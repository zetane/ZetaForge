import { useEffect, useRef, useState } from "react";
import { LogsCodeMirror } from "./CodeMirrorComponents";

const LogsViewer = ({ filePath, startFetching }) => {
  const [logs, setLogs] = useState("");
  const [stickBottom, setStickBottom] = useState(false);
  const logsDiv = useRef(null);
  const serverAddress = "http://localhost:3330";

  useEffect(() => {
    let interval;

    if (startFetching) {
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
  }, [filePath, startFetching]);

  const isAtBottom = () => {
    return logsDiv.current.scrollHeight - logsDiv.current.scrollTop - logsDiv.current.clientHeight < 100;
  }

  const scrollToBottom = () => {
    console.log(stickBottom)
    if (stickBottom) {
      logsDiv.current.scrollTo({ lef: 0, top: logsDiv.current.scrollHeight, behavior: "smooth" });
    }
  }

  return (
    <div ref={logsDiv} className="overflow-y-scroll max-h-full">
      <LogsCodeMirror code={logs} onUpdate={scrollToBottom} />
    </div>
  );
};

export default LogsViewer;
