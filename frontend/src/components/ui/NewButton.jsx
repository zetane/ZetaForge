import { pipelineFactory, addPipeline } from "@/atoms/pipelineAtom";
import { HeaderMenuItem } from "@carbon/react";

export default function NewButton() {
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
