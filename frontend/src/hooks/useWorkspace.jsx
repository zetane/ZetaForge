import { pipelinesAtom, writeWorkspaceAtom } from "@/atoms/pipelineAtom";
import { produce } from "immer";
import { useAtom } from "jotai";

export const useWorkspace = () => {
  const [workspace, setWorkspace] = useAtom(writeWorkspaceAtom);
  const [pipelines, setPipelines] = useAtom(pipelinesAtom);

  const updateTabs = (newTabs, newActive) => {
    const updatedWorkspace = produce(workspace, (draft) => {
      draft.tabs = newTabs;
      draft.active = newActive;
    });
    setWorkspace(updatedWorkspace);
  };

  const addPipeline = (newPipeline, remove = false) => {
    const updatedPipelines = produce(pipelines, (draft) => {
      draft[newPipeline.key] = newPipeline;
    });
    setPipelines(updatedPipelines);

    const updatedWorkspace = produce(workspace, (draft) => {
      draft.tabs[newPipeline.key] = newPipeline;
      draft.active = newPipeline.key;
      if (remove) {
        delete draft.tabs[remove];
      }
    });
    setWorkspace(updatedWorkspace);
  };

  const deleteTab = (key) => {
    const updatedWorkspace = produce(workspace, (draft) => {
      delete draft.tabs[key];
    });
    setWorkspace(updatedWorkspace);
  };

  return { addPipeline, deleteTab, updateTabs };
};
