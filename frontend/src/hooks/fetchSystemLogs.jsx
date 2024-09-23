import { useCallback, useEffect, useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { useQuery } from "@tanstack/react-query";
import { getFileData } from "@/utils/s3";
import { useImmerAtom } from "jotai-immer";
import { systemLogsAtom } from "@/atoms/logsAtom";
import { useImmer } from "use-immer";

export const fetchSystemLogs = () => {
  const [logs, setLogs] = useImmerAtom(systemLogsAtom);

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
};
