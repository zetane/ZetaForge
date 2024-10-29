import { workspaceAtom, pipelinesAtom } from "@/atoms/pipelineAtom";
import { produce } from "immer";
import { useAtom } from "jotai";
import { db } from "@/utils/db";

export const useWorkspace = () => {
  const [workspace, setWorkspace] = useAtom(workspaceAtom);
  const [pipelines, setPipelines] = useAtom(pipelinesAtom);

  const addPipeline = (newPipeline) => {
    const updatedPipelines = produce(pipelines, (draft) => {
      draft[newPipeline.key] = newPipeline;
    });
    setPipelines(updatedPipelines);

    const updatedWorkspace = produce(workspace, (draft) => {
      draft.tabs[newPipeline.key] = newPipeline;
      draft.active = newPipeline.key;
    });
    setWorkspace(updatedWorkspace);

    db.workspace.put({ id: "currentState", data: updatedWorkspace });
  };

  const deleteTab = (key) => {
    const updatedWorkspace = produce(workspace, (draft) => {
      delete draft.tabs[key];
    });
    setWorkspace(updatedWorkspace);
    db.workspace.put({ id: "currentState", data: updatedWorkspace });
  };

  return { addPipeline, deleteTab };
};
