import { useQuery, useQueries } from "@tanstack/react-query";
import {
  useLoadExecution,
  useLoadServerPipeline,
} from "@/hooks/useLoadPipeline";
import { useEffect } from "react";
import { workspaceAtom } from "@/atoms/pipelineAtom";
import { useImmerAtom } from "jotai-immer";
import { useAtom } from "jotai";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { fetchExecutionDetails, getAllPipelines, ping } from "@/client/anvil";
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
  const loadExecution = useLoadExecution();
  const [configuration] = useAtom(activeConfigurationAtom);
  const syncResults = useSyncExecutionResults();
  const queryKey = ["pipelines", configuration?.anvil?.host];

  const {
    pending,
    error,
    data: pipelinesData,
  } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      return await getAllPipelines(configuration);
    },
    refetchInterval: workspace.fetchInterval,
  });
  const {
    isPending: pingPending,
    error: pingError,
    data: pingData,
  } = useQuery({
    queryKey: ["ping"],
    queryFn: async () => {
      try {
        return await ping(configuration);
      } catch (err) {
        setWorkspace((d) => {
          d.connected = false;
        });
        throw new Error(err);
      }
    },
    refetchInterval: 2000,
    retry: false,
    onSuccess: () =>
      setWorkspace((d) => {
        d.connected = true;
      }),
  });

  const getDetails = async (key, existing, configuration, execution) => {
    const fetchedExec = await fetchExecutionDetails(configuration, execution);
    const loadedExecution = await loadExecution(fetchedExec, configuration);
    const isActive = workspace.tabs[key];
    const merged = { ...existing, ...loadedExecution };
    setWorkspace((draft) => {
      draft.pipelines[key] = merged;
    });
    if (isActive) {
      try {
        await syncResults(key);
      } catch (err) {
        console.error("Failed to sync results: ", err);
      }
    }
    return merged;
  };

  useQueries({
    queries: Object.keys(workspace.tabs)
      ?.filter((key) => {
        const pipeline = workspace.pipelines[key];
        const existingStatus = pipeline?.record?.Status;

        return existingStatus === "Running" || existingStatus === "Pending";
      })
      .map((key) => {
        const pipeline = workspace.pipelines[key];
        const id = key.split(".")[1];
        return {
          queryKey: ["execution", key],
          queryFn: () => getDetails(key, pipeline, configuration, id),
          enabled: !pending && !error,
          refetchInterval: 1000,
        };
      }),
  });

  const loadShell = async (key, serverPipeline, configuration) => {
    const loaded = await loadPipeline(serverPipeline, configuration);
    setWorkspace((draft) => {
      draft.pipelines[key] = loaded;
    });
  };

  useEffect(() => {
    if (pipelinesData) {
      pipelinesData.body?.forEach((serverPipeline) => {
        const key = serverPipeline.Uuid + "." + serverPipeline.Execution;
        const existing = workspace.pipelines[key];
        if (!existing) {
          loadShell(key, serverPipeline, pipelinesData.configuration);
        }
      });
    }
  }, [pipelinesData]);

  useEffect(() => {
    const lineage = getLineage(workspace);
    setWorkspace((draft) => {
      draft.lineage = lineage;
    });
  }, [workspace.pipelines]);

  return null;
}
