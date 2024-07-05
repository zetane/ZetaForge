import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useAtom, useAtomValue } from "jotai";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { useQuery } from "@tanstack/react-query";
import { getFileData } from "@/utils/s3";
import { useStableWebSocket } from "@/hooks/useStableWebsocket";

interface ParsedLogEntry {
  executionId: string;
  blockId?: string;
  message: string;
  tag?: string;
  data?: any;
  time: string;
  [key: string]: any;
}

function stripAnsiCodes(str: string) {
  return str.replace(/\u001b\[[0-9;]*[mGK]/g, "");
}

function parseLogLine(line: string): ParsedLogEntry | null {
  const { executionId, time, message, blockId, ...otherFields } =
    JSON.parse(line);
  const strippedMessage = stripAnsiCodes(message);

  // Split the message on |||
  const [tag, dataString] = strippedMessage.split("|||").map((s) => s.trim());

  // Parse the data string if it exists and is valid JSON
  let data = {};
  if (dataString) {
    try {
      data = JSON.parse(JSON.stringify(dataString));
    } catch (e) {
      console.warn("Failed to parse data string:", dataString);
      data = { rawData: dataString };
    }
  }
  return {
    executionId,
    blockId,
    message,
    tag,
    data,
    time,
    ...otherFields,
  };
}

export const useUnifiedLogs = () => {
  const [pipeline, setPipeline] = useAtom(pipelineAtom);
  const configuration = useAtomValue(activeConfigurationAtom);
  const [logs, setLogs] = useState<Map<string, ParsedLogEntry>>(new Map());

  const { lastMessage, readyState, wsError } = useStableWebSocket(
    pipeline?.socketUrl,
  );

  // Function to update logs
  const updateLogs = useCallback((newEntries: ParsedLogEntry[]) => {
    setLogs((prevLogs) => {
      const updatedLogs = new Map(prevLogs);
      newEntries.forEach((entry) => {
        const key = `${entry.time}-${entry.executionId}-${entry.blockId || ""}-${entry.message}`;
        updatedLogs.set(key, entry);
      });
      return updatedLogs;
    });
  }, []);

  // 1. Handle logs from useLoadServerPipeline
  useEffect(() => {
    if (pipeline?.logs) {
      const serverLogs = Array.isArray(pipeline.logs)
        ? pipeline.logs
        : [pipeline.logs];
      const parsedServerLogs = serverLogs
        .map((log) => parseLogLine(log))
        .filter((log): log is ParsedLogEntry => log !== null);
      updateLogs(parsedServerLogs);
    }
  }, [pipeline?.logs, updateLogs]);

  // 2. Handle logs from React Query
  const { data: polledData } = useQuery({
    queryKey: ["logs", pipeline?.history],
    queryFn: async () => {
      const fileData = await getFileData(
        pipeline?.record?.LogPath,
        configuration,
      );
      return fileData.split("\n").filter((line) => line.trim() !== "");
    },
    enabled: pipeline?.record?.LogPath != null,
  });

  useEffect(() => {
    if (polledData) {
      const parsedPolledLogs = polledData
        .map(parseLogLine)
        .filter((log): log is ParsedLogEntry => log !== null);
      updateLogs(parsedPolledLogs);
    }
  }, [polledData, updateLogs]);

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

  // Sort logs by time
  const sortedLogs = useMemo(() => {
    return Array.from(logs.values()).sort((a, b) =>
      a.time.localeCompare(b.time),
    );
  }, [logs]);

  return {
    logs: sortedLogs,
  };
};
