import { useQuery } from "@tanstack/react-query";
import { useLoadServerPipeline } from "@/hooks/useLoadPipeline";
import { useEffect } from "react";
import { workspaceAtom } from "@/atoms/pipelineAtom";
import { useImmerAtom } from "jotai-immer";
import { useAtom } from "jotai";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { getAllPipelines, ping } from "@/client/anvil";
import { useSyncExecutionResults } from "@/hooks/useExecutionResults";

const getLineage = (workspace) => {
  const lineage = new Map();

  if (!workspace?.pipelines) {
    return lineage;
  }

  // Filter out pipelines with empty .record fields
  const validPipelines = Object.values(workspace?.pipelines).filter(
    (pipeline) => pipeline.record && Object.keys(pipeline.record).length > 0,
  );

  Object.values(validPipelines).forEach((pipeline) => {
    const record = pipeline?.record;
    const sha1Hash = record?.Hash;
    if (!record || !sha1Hash) {
      return;
    }
    const pipelineData = JSON.parse(record.PipelineJson);
    const friendlyName = pipelineData.name;
    if (!lineage.has(sha1Hash)) {
      const createDate = new Date(record.Created * 1000);
      lineage.set(sha1Hash, {
        id: pipeline.id,
        name: friendlyName,
        hash: sha1Hash,
        deployed: record.Deployed,
        pipelineData: pipelineData,
        created: createDate.toLocaleString(),
        lastExecution: createDate.toLocaleString(),
        host: pipeline.host,
        executions: new Map(),
      });
    }

    const lineageEntry = lineage.get(sha1Hash);
    const existingExecution = lineageEntry.executions.get(record.Execution);

    if (!existingExecution) {
      const execDate = new Date(record.ExecutionTime * 1000);
      lineageEntry.executions.set(record.Execution, {
        id: record.Execution,
        hash: sha1Hash,
        pipeline: pipeline.id,
        created: execDate.toLocaleString(),
        status: record.Status,
      });
    } else {
      Object.assign(existingExecution, {
        status: pipeline.record.Status,
        created: new Date(
          pipeline.record.ExecutionTime * 1000,
        ).toLocaleString(),
      });
    }

    const mostRecent = Array.from(lineageEntry.executions.values())[0]?.created;
    if (mostRecent) {
      lineageEntry.lastExecution = mostRecent;
    }
  });

  return lineage;
};

export default function WorkspaceFetcher() {
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const loadPipeline = useLoadServerPipeline();
  const [configuration] = useAtom(activeConfigurationAtom);
  const syncResults = useSyncExecutionResults();
  const queryKey = ["pipelines", configuration?.anvil?.host];

  const { pending, error, data } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      return await getAllPipelines(configuration);
    },
    refetchInterval: workspace.fetchInterval,
  });

  const { pingPending, pingError, pingData } = useQuery({
    queryKey: ["ping"],
    queryFn: async () => {
      return await ping(configuration);
    },
    refetchInterval: 3000,
    onSuccess: () =>
      setWorkspace((d) => {
        d.connected = true;
      }),
    onError: () =>
      setWorkspace((d) => {
        d.connected = false;
      }),
  });

  useEffect(() => {
    console.log(data);
    const updatePipelines = async () => {
      const pipelines = data?.body ?? [];
      const host = data?.configuration?.anvil?.host;
      const port = data?.configuration?.anvil?.port;
      const hostString = host + ":" + port;

      for (const serverPipeline of pipelines) {
        const key = serverPipeline.Uuid + "." + serverPipeline.Execution;
        const existing = workspace.pipelines[key];

        const existingStatus = existing?.record?.Status;
        const shouldUpdate =
          !existing ||
          serverPipeline?.Status != existingStatus ||
          serverPipeline?.Deployed != existing?.record?.Deployed;

        if (shouldUpdate) {
          try {
            const loaded = await loadPipeline(serverPipeline, hostString);
            console.log(loaded);
            setWorkspace((draft) => {
              draft.pipelines[key] = loaded;
            });
          } catch (e) {
            console.log("Failed to load ", e);
            return;
          }

          if (workspace.tabs[key]) {
            await syncResults(key);
          }
        }

        const isLogging =
          serverPipeline.Status == "Pending" ||
          serverPipeline.Status == "Running";

        if (existing && isLogging) {
          setWorkspace((draft) => {
            draft.pipelines[key].logs = serverPipeline?.Log;
          });
        }
      }
    };

    updatePipelines();
  }, [data]);

  useEffect(() => {
    const lineage = getLineage(workspace);
    setWorkspace((draft) => {
      draft.lineage = lineage;
    });
  }, [workspace.pipelines]);

  return null;
}
