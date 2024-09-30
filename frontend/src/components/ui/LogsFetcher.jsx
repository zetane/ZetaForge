import { socketUrlAtom, pipelineAtom } from "@/atoms/pipelineAtom";
import { useSyncExecutionResults } from "@/hooks/useExecutionResults";
import { useStableWebSocket } from "@/hooks/useStableWebsocket";
import { enableMapSet } from "immer";
import { useAtom, useAtomValue } from "jotai";
import { useImmerAtom } from "jotai-immer";
import { useCallback, useEffect, useMemo } from "react";
import { logsAtom, parseLogLine } from "@/atoms/logsAtom";
import { useQuery } from "@tanstack/react-query";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { getS3FileData, getLocalFileData } from "@/utils/s3";

enableMapSet();

function splitLogPath(input) {
  const parts = input.split("/");

  if (parts.length < 3) {
    throw new Error("Input string does not have enough parts");
  }

  const pipelineId = parts[0];
  const executionId = parts[1];
  const file = parts.slice(2).join("/");

  return { pipelineId, executionId, file };
}

async function fetchLogData(logPath, configuration) {
  const { pipelineId, executionId, file } = splitLogPath(logPath);
  const localFileKey = `${pipelineId}/history/${executionId}/files/${file}`;

  try {
    // First, try to fetch from localhost
    const localData = await getLocalFileData(localFileKey);
    return localData;
  } catch (error) {
    console.log("Failed to fetch from localhost, falling back to S3:", error);

    // If local fetch fails, try S3
    const s3Data = await getS3FileData(logPath, configuration);
    return s3Data;
  }
}

export default function LogsFetcher() {
  const [socketUrl] = useAtom(socketUrlAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  //const { lastMessage, readyState, wsError } = useStableWebSocket(socketUrl);
  const syncResults = useSyncExecutionResults();
  const [logs, setLogs] = useImmerAtom(logsAtom);
  const configuration = useAtomValue(activeConfigurationAtom);

  const updateLogs = useCallback((newEntries) => {
    newEntries.forEach((newEntry) => {
      const entry = parseLogLine(newEntry);
      if (!entry.message) {
        return;
      }
      const key = `${entry?.time}-${entry?.executionId}-${entry?.blockId || ""}-${entry?.message}`;
      setLogs((draft) => {
        draft.set(key, entry);
      });
      updateNodes(entry);
    });
  }, []);

  // Clears logs when we swap tabs (otherwise they mix together)
  useEffect(() => {
    setLogs((draft) => draft.clear());
  }, [pipeline?.history]);

  // Fetches logs when the pipeline has finished (LogPath will be set)
  const fetchLogPath = !!pipeline?.record && pipeline.record?.LogPath != "";
  const { data: polledData } = useQuery({
    queryKey: ["logs", pipeline?.history],
    queryFn: async () => {
      const fileData = await fetchLogData(
        pipeline?.record?.LogPath,
        configuration,
      );
      return fileData.split("\n").filter((line) => line.trim() !== "");
    },
    enabled: fetchLogPath,
  });

  // If we update the logs from the server we call updateLogs
  useEffect(() => {
    if (polledData) {
      updateLogs(polledData);
      return;
    }
    if (pipeline?.logs) {
      const serverLogs = Array.isArray(pipeline.logs)
        ? pipeline.logs
        : [pipeline.logs];
      const filteredLogs = serverLogs.filter((log) => log !== null);

      updateLogs(filteredLogs);
    }
  }, [polledData, pipeline?.logs]);

  const updateNodes = useCallback(async (parsedLogEntry) => {
    if (pipeline?.data[parsedLogEntry?.blockId?.slice(6)]) {
      if (
        parsedLogEntry?.event?.tag === "outputs" ||
        parsedLogEntry?.event?.tag === "inputs"
      ) {
        setPipeline((draft) => {
          const node = draft.data[parsedLogEntry?.blockId.slice(6)];
          try {
            node.events[parsedLogEntry.event?.tag] = parsedLogEntry.event?.data;
          } catch (err) {
            console.error(`Failed to parse ${parsedLogEntry.event?.tag}:`, err);
          }
        });
      }
    }

    if (parsedLogEntry?.event?.tag === "outputs") {
      const key = `${pipeline.record?.Uuid}.${pipeline.record?.Execution}`;
      try {
        syncResults(key);
      } catch (err) {
        console.error("Failed to sync: ", err);
      }
    }
  });

  // Updater func for the socket
  // Commented because polling is more stable until we have a better socket connection
  /*
  useEffect(() => {
    if (lastMessage !== null) {
      const content = JSON.parse(lastMessage?.data)?.content;
      if (content) {
        updateLogs([content]);

        const parsedLogEntry = parseLogLine(content);
        if (!parsedLogEntry?.blockId) {
          return;
        }
        // Update pipeline state if needed
        updateNodes(parsedLogEntry);
      }
    }
  }, [lastMessage, updateLogs, setPipeline]);
  */

  return null;
}
