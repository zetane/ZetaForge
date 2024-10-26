import { useImmerAtom } from "jotai-immer";
import { workspaceAtom, pipelinesAtom } from "@/atoms/pipelineAtom";

export const useWorkspace = () => {
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const [pipelines, setPipelines] = useImmerAtom(pipelinesAtom);

  const addPipeline = (newPipeline) => {
    setPipelines((draft) => {
      draft[newPipeline.key] = newPipeline;
    });

    setWorkspace((draft) => {
      draft.tabs[newPipeline.key] = newPipeline;
      draft.active = newPipeline.key;
    });
  };

  const deleteTab = (key) => {
    setWorkspace((draft) => {
      delete draft.tabs[key];
    });
  };

  return { addPipeline, deleteTab };
};
