import { useEffect, useState } from "react";
import ScrollToBottom from "react-scroll-to-bottom";
import { LogsCodeMirror } from "@/components/ui/blockEditor/directoryViewer/CodeMirrorComponents";

const useLogsPolling = (interval = 5000) => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const newLogs = await window.systemLogs.requestLatestLogs();
        setLogs((prevLogs) => {
          const newLogEntries = newLogs.filter(
            (log) =>
              !prevLogs.some(
                (prevLog) =>
                  prevLog.time === log.time &&
                  prevLog.msg === log.msg &&
                  prevLog.childProcess === log.childProcess,
              ),
          );
          return [...prevLogs, ...newLogEntries];
        });
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
    };

    fetchLogs(); // Initial fetch
    const id = setInterval(fetchLogs, interval); // Polling

    return () => clearInterval(id);
  }, [interval]);

  return logs;
};

const LogViewer = () => {
  const logs = useLogsPolling(3000); // Poll every 3 seconds

  const formatLogs = (log) => {
    let date;
    try {
      date = new Date(log.time).toISOString();
    } catch {
      date = "";
    }
    let formattedLog = "";
    if ("caller" in log) {
      formattedLog = `[${date}]  ${log.caller}  ${log.msg}`;
    } else if ("err" in log) {
      formattedLog = `[${date}]  ${JSON.stringify(log)}`;
    } else if ("childProcess" in log) {
      formattedLog = `${log.childProcess}`;
    } else {
      formattedLog = JSON.stringify(log);
    }
    return formattedLog;
  };

  return (
    <ScrollToBottom className="viewer-container">
      <div className="logs-viewer">
        <LogsCodeMirror code={logs.map(formatLogs).join("\n")} />
      </div>
    </ScrollToBottom>
  );
};

export default LogViewer;
