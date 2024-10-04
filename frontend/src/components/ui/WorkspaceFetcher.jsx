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

  useEffect(() => {
    if (!pipelinesData?.body) {
      return;
    }
    const pipelinesToLoad = pipelinesData.body?.filter((serverPipeline) => {
      const key = serverPipeline.Uuid + "." + serverPipeline.Execution;
      const existing = workspace.pipelines[key];
      const wasDeployed =
        existing && existing?.record?.Deployed != serverPipeline.Deployed;
      const statusUpdated =
        existing && existing?.record?.Status != serverPipeline.Status;
      return !existing || wasDeployed || statusUpdated;
    });

    // If there are pipelines to load, process them
    const loadPromises = pipelinesToLoad.map(async (serverPipeline) => {
      const key = serverPipeline.Uuid + "." + serverPipeline.Execution;
      const loaded = await loadPipeline(
        serverPipeline,
        pipelinesData.configuration,
      );
      return [key, loaded];
    });

    Promise.all(loadPromises)
      .then((results) => {
        const loadObj = Object.fromEntries(results);
        setWorkspace((draft) => {
          draft.pipelines = { ...workspace.pipelines, ...loadObj };
        });
      })
      .catch((error) => {
        console.error("Error loading pipelines:", error);
      });
  }, [pipelinesData]);

  return null;
}
