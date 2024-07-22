import { useCallback, useEffect, useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { useQuery } from "@tanstack/react-query";
import { getFileData } from "@/utils/s3";
import { useImmerAtom } from "jotai-immer";
import { logsAtom, parseLogLine } from "@/atoms/logsAtom";

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
      const fileData = await getFileData(
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
