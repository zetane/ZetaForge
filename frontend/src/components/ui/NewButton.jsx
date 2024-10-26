import { pipelineFactory } from "@/atoms/pipelineAtom";
import { useWorkspace } from "@/hooks/useWorkspace";
import { HeaderMenuItem } from "@carbon/react";

export default function NewButton() {
  const { addPipeline } = useWorkspace();
  const handleClick = async () => {
    const newPipeline = pipelineFactory(await window.cache.local());
    addPipeline(newPipeline);
  };

  return (
    <div>
      <HeaderMenuItem onClick={() => handleClick()}>New</HeaderMenuItem>
    </div>
  );
}
