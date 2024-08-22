import { useCallback, useEffect, useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { useQuery } from "@tanstack/react-query";
import { getS3FileData, getLocalFileData } from "@/utils/s3";
import { useImmerAtom } from "jotai-immer";
import { logsAtom, parseLogLine } from "@/atoms/logsAtom";

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

export const useUnifiedLogs = () => {
  const [pipeline, _] = useAtom(pipelineAtom);
  const configuration = useAtomValue(activeConfigurationAtom);
  const [logs, setLogs] = useImmerAtom(logsAtom);

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
    });
  }, []);

  useEffect(() => {
    setLogs((draft) => draft.clear());
  }, [pipeline?.history]);

  useEffect(() => {
    if (pipeline?.logs) {
      const serverLogs = Array.isArray(pipeline.logs)
        ? pipeline.logs
        : [pipeline.logs];
      const filteredLogs = serverLogs.filter((log) => log !== null);

      updateLogs(filteredLogs);
    }
  }, [pipeline?.logs, updateLogs]);

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

  useEffect(() => {
    if (polledData) {
      updateLogs(polledData);
    }
  }, [polledData, updateLogs]);

  return {
    updateLogs: updateLogs,
  };
};
