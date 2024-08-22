import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { useQueryClient } from "@tanstack/react-query";
import { mixpanelAtom } from "@/atoms/mixpanelAtom";
import generateSchema from "@/utils/schemaValidation";
import { trpc } from "@/utils/trpc";
import { Button } from "@carbon/react";
import { useAtom } from "jotai";
import { useImmerAtom } from "jotai-immer";
import { useState } from "react";
import { uuidv7 } from "uuidv7";
import ClosableModal from "./modal/ClosableModal";
import { workspaceAtom } from "@/atoms/pipelineAtom";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { useLoadServerPipeline } from "@/hooks/useLoadPipeline";
import { ping } from "@/client/anvil";

export default function RunPipelineButton({ children, action }) {
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline] = useImmerAtom(pipelineAtom);
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const [validationErrorMsg, setValidationErrorMsg] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mixpanelService] = useAtom(mixpanelAtom);
  const [configuration] = useAtom(activeConfigurationAtom);
  const executePipeline = trpc.executePipeline.useMutation();
  const queryClient = useQueryClient();
  const loadServerPipeline = useLoadServerPipeline();

  const runPipeline = async () => {
    if (!validatePipelineExists()) return;

    setValidationErrorMsg([]);

    const pipelineSpecs = editor.convert_drawflow_to_block(
      pipeline.name,
      pipeline.data,
    );
    const executionId = uuidv7();

    if (!validateSchema()) return;
    const newExecution = await execute(pipelineSpecs, executionId);
    if (!newExecution) {
      return;
    }

    queryClient.setQueryData(["pipelines"], (oldExecutions) => {
      let updatedPipelines = [];

      if (oldExecutions && Array.isArray(oldExecutions)) {
        // Check if the new execution already exists in the array
        const existingIndex = oldExecutions.findIndex(
          (execution) => execution.Execution === newExecution.Execution,
        );

        if (existingIndex !== -1) {
          // If the execution exists, replace it with the new execution
          updatedPipelines = [
            ...oldExecutions.slice(0, existingIndex),
            newExecution,
            ...oldExecutions.slice(existingIndex + 1),
          ];
        } else {
          // If the execution doesn't exist, add it to the beginning of the array
          updatedPipelines = [newExecution, ...oldExecutions];
        }
      } else {
        // If oldExecutions is not an array, return a new array with the new execution
        updatedPipelines = [newExecution];
      }
      return updatedPipelines;
    });

    const loaded = await loadServerPipeline(newExecution, configuration);
    setWorkspace((draft) => {
      const currentTab = draft.active;
      const newKey = newExecution.Uuid + "." + newExecution.Execution;
      const pipeline = draft.pipelines[newKey];
      if (!pipeline) {
        // key hasn't updated yet
        draft.pipelines[newKey] = loaded;
      }
      draft.tabs[newKey] = {};
      draft.active = newKey;
      delete draft.tabs[currentTab];
    });

    trackMixpanelRunCreated();
  };

  const validatePipelineExists = async () => {
    return pipeline.data && Object.keys(pipeline.data).length;
  };

  const execute = async (pipelineSpecs, executionId) => {
    try {
      const rebuild = action == "Rebuild";
      const newExecution = await executePipeline.mutateAsync({
        id: pipeline.id,
        executionId: executionId,
        specs: pipelineSpecs,
        path: pipeline.path,
        buffer: pipeline.buffer,
        name: pipeline.name,
        rebuild: rebuild,
        anvilConfiguration: configuration,
      });
      return newExecution;
    } catch (error) {
      console.log(error);
      setValidationErrorMsg([error?.message]);
      setIsOpen(true);
      return false;
    }
  };

  const validateSchema = () => {
    const schema = generateSchema(pipeline.data);
    const results = schema.safeParse(pipeline.data);

    if (results.success) {
      return true;
    } else {
      setValidationErrorMsg(() => {
        return results.error.issues.map(
          (block) => `${block.path[0]}: ${block.message}`,
        );
      });
      setIsOpen(true);
      return false;
    }
  };

  const trackMixpanelRunCreated = () => {
    try {
      mixpanelService.trackEvent("Run Created");
    } catch (err) {
      console.error("Mixpanel run tracking failed");
    }
  };

  const styles = {
    margin: "5px",
  };

  return (
    <>
      <Button
        style={styles}
        size="sm"
        onClick={() => runPipeline()}
        disabled={!workspace?.connected}
      >
        <span>{action}</span>
        {children}
      </Button>

      <ClosableModal
        modalHeading="The following error(s) occurred:"
        passiveModal={true}
        open={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <div className="flex flex-col gap-4 p-3">
          {validationErrorMsg.map((error, i) => {
            return <p key={"error-msg-" + i}>{error}</p>;
          })}
        </div>
      </ClosableModal>
    </>
  );
}
