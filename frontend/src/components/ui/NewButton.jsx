import {
  workspaceAtom,
  pipelineFactory,
  pipelineKey,
} from "@/atoms/pipelineAtom";
import { HeaderMenuItem } from "@carbon/react";
import { useImmerAtom } from "jotai-immer";

export default function NewButton() {
  const [, setWorkspace] = useImmerAtom(workspaceAtom);

  const handleClick = async () => {
    const newPipeline = pipelineFactory(await window.cache.local());
    const key = pipelineKey(newPipeline.id, null);
    setWorkspace((draft) => {
      draft.tabs[key] = {};
      draft.pipelines[key] = newPipeline;
      draft.active = key;
    });
  };

  return (
    <div>
      <HeaderMenuItem onClick={handleClick}>New</HeaderMenuItem>
    </div>
  );
}
