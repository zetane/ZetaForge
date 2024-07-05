import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useLoadServerPipeline } from "@/hooks/useLoadPipeline";
import { useEffect } from "react";
import { workspaceAtom } from "@/atoms/pipelineAtom";
import { useImmerAtom } from "jotai-immer";
import { useAtom } from "jotai";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";

export default function WorkspaceFetcher() {
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const loadPipeline = useLoadServerPipeline();
  const [configuration] = useAtom(activeConfigurationAtom);

  const { pending, error, data } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const res = await axios.get(
        `http://${configuration.anvil.host}:${configuration.anvil.port}/pipeline/filter?limit=100000&offset=0`,
      );
      return res.data;
    },
    refetchInterval: workspace.fetchInterval,
  });

  console.log(":(");

  useEffect(() => {
    const pipelines = data ?? [];
    for (const serverPipeline of pipelines) {
      const key = serverPipeline.Uuid + "." + serverPipeline.Execution;
      const existing = workspace.pipelines[key];

      const existingStatus = existing?.record?.Status;
      const shouldUpdate = serverPipeline.Status != existingStatus || !existing;

      if (shouldUpdate) {
        const loaded = loadPipeline(serverPipeline, configuration);
        console.log(
          `updating status ${existingStatus} to ${serverPipeline.Status} for ${key}`,
        );
        setWorkspace((draft) => {
          draft.pipelines[key] = loaded;
          draft.executions[loaded.record.Execution] = loaded;
        });
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
  }, [data]);

  return null;
}
