import { useQuery, useQueries } from "@tanstack/react-query";
import {
  useLoadExecution,
  useLoadServerPipeline,
} from "@/hooks/useLoadPipeline";
import { useEffect } from "react";
import { pipelinesAtom, writeImmerWorkspace } from "@/atoms/pipelineAtom";
import { useImmerAtom } from "jotai-immer";
import { useAtom } from "jotai";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { fetchExecutionDetails, getAllPipelines, ping } from "@/client/anvil";
import { useSyncExecutionResults } from "@/hooks/useExecutionResults";
import { produce } from "immer";

export default function WorkspaceFetcher() {
  const [pipelines, setPipelines] = useAtom(pipelinesAtom);
  const [workspace, setWorkspace] = useImmerAtom(writeImmerWorkspace);
  const loadPipeline = useLoadServerPipeline();
  const loadExecution = useLoadExecution();
  const [configuration] = useAtom(activeConfigurationAtom);
  const syncResults = useSyncExecutionResults();

  useQuery({
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
    onSuccess: () => {
      if (!workspace.connected) {
        setWorkspace((d) => {
          d.connected = true;
        });
      }
    },
  });

  const syncWorkspace = async (key, existing, configuration, execution) => {
    const fetchedExec = await fetchExecutionDetails(configuration, execution);
    const loadedExecution = await loadExecution(fetchedExec, configuration);
    const isActive = workspace.tabs[key];
    const merged = { ...existing, ...loadedExecution };
    setWorkspace((draft) => {
      draft.tabs[key] = merged;
    });

    const updatedPipelines = produce(pipelines, (draft) => {
      draft[key] = merged;
    });
    setPipelines(updatedPipelines);
    if (isActive) {
      try {
        // TODO:
        // Surface sync errors
        syncResults(key).catch((err) => {
          console.log(err);
        });
      } catch (err) {
        console.error("Failed to sync results: ", err);
      }
    }
    return merged;
  };

  // Main polling function
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
    refetchInterval: 20000,
    enabled: true,
  });

  // Polls for executions
  useQueries({
    queries: Object.keys(workspace?.tabs ?? {})
      ?.filter((key) => {
        const pipeline = pipelines[key];
        const existingStatus = pipeline?.record?.Status;
        return existingStatus === "Running" || existingStatus === "Pending";
      })
      .map((key) => {
        const pipeline = pipelines[key];
        const id = key.split(".")[1];
        return {
          queryKey: ["execution", key],
          queryFn: () => syncWorkspace(key, pipeline, configuration, id),
          enabled: !pending && !error,
          refetchInterval: 2000,
        };
      }),
  });

  // Once we poll, we write the whole data store
  useEffect(() => {
    if (!pipelinesData?.body) {
      return;
    }
    const pipelinesToLoad = pipelinesData.body?.filter((serverPipeline) => {
      const key = serverPipeline.Uuid + "." + serverPipeline.Execution;
      const existing = pipelines[key];
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
        setPipelines({ ...pipelines, ...loadObj });
      })
      .catch((error) => {
        console.error("Error loading pipelines:", error);
      });
  }, [pipelinesData]);

  return null;
}
