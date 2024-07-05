import { useAtom } from "jotai";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { useEffect } from "react";
import { useStableWebSocket } from "@/hooks/useStableWebsocket";

export default function SocketFetcher() {
  const [pipeline, setPipeline] = useAtom(pipelineAtom);
  const { lastMessage, readyState, wsError } = useStableWebSocket(
    pipeline?.socketUrl,
  );

  useEffect(() => {
    if (lastMessage !== null) {
      const content = JSON.parse(lastMessage.data).content;
      const parsedLogEntry = parseLogLine(content);
      if (parsedLogEntry) {
        updateLogs([parsedLogEntry]);

        if (!parsedLogEntry?.blockId) {
          return;
        }
        // Update pipeline state if needed
        setPipeline((draft) => {
          if (draft?.data[parsedLogEntry?.blockId]) {
            const node = draft.data[parsedLogEntry?.blockId];
            if (
              parsedLogEntry.tag === "outputs" ||
              parsedLogEntry.tag === "inputs"
            ) {
              try {
                const data = parsedLogEntry.data;
                if (data && typeof data === "object") {
                  if (!node.events[parsedLogEntry.tag]) {
                    node.events[parsedLogEntry.tag] = {};
                  }
                  Object.assign(node.events[parsedLogEntry.tag], data);
                }
              } catch (err) {
                console.error(`Failed to parse ${parsedLogEntry.tag}:`, err);
              }
            }
          }
        });
      }
    }
  }, [lastMessage, updateLogs, setPipeline]);

  return null;
}
