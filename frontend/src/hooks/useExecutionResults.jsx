import { workspaceAtom } from "@/atoms/pipelineAtom";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { trpc } from "@/utils/trpc";
import { useAtom } from "jotai";

export const useSyncExecutionResults = () => {
  const [workspace] = useAtom(workspaceAtom);
  const [configuration] = useAtom(activeConfigurationAtom);
  const downloadExecutionResults = trpc.downloadExecutionResults.useMutation();

  const syncExecutionResults = async (key) => {
    const pipeline = workspace.pipelines[key];
    await downloadExecutionResults.mutateAsync({
      pipelinePath: pipeline.path,
      pipelineUuid: pipeline.record.Uuid,
      executionUuid: pipeline.record.Execution,
      anvilConfiguration: configuration,
    });
  };

  return syncExecutionResults;
};
