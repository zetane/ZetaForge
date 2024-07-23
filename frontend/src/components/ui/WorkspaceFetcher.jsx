import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useLoadServerPipeline } from "@/hooks/useLoadPipeline";
import { useEffect } from "react";
import { workspaceAtom } from "@/atoms/pipelineAtom";
import { useImmerAtom } from "jotai-immer";
import { useAtom } from "jotai";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { getAllPipelines } from "@/client/anvil";
import { useSyncExecutionResults } from "@/hooks/useExecutionResults";

export default function WorkspaceFetcher() {
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const loadPipeline = useLoadServerPipeline();
  const [configuration] = useAtom(activeConfigurationAtom);
  const syncResults = useSyncExecutionResults();

  const { pending, error, data } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      return await getAllPipelines(configuration);
    },
    refetchInterval: workspace.fetchInterval,
  });

  useEffect(() => {
    const updatePipelines = async () => {
      const pipelines = data ?? [];
      for (const serverPipeline of pipelines) {
        const key = serverPipeline.Uuid + "." + serverPipeline.Execution;
        const existing = workspace.pipelines[key];

        const existingStatus = existing?.record?.Status;
        const shouldUpdate =
          serverPipeline?.Status != existingStatus || !existing;

        if (shouldUpdate) {
          try {
            const loaded = await loadPipeline(serverPipeline, configuration);
            setWorkspace((draft) => {
              draft.pipelines[key] = loaded;
              draft.executions[loaded?.record?.Execution] = loaded;
            });
            if (workspace.tabs[key]) {
              await syncResults(key, serverPipeline.Status);
            }
          } catch (e) {
            console.log("Failed to load ", e);
            return;
          }
        }

        const isLogging =
          serverPipeline.Status == "Pending" ||
          serverPipeline.Status == "Running";

        if (existing && isLogging) {
          setWorkspace((draft) => {
            draft.pipelines[key].logs = serverPipeline?.Log;
            draft.executions[serverPipeline?.Execution].logs =
              serverPipeline?.Log;
          });
        }
      }
    };

    updatePipelines();
  }, [data]);

  return null;
}
