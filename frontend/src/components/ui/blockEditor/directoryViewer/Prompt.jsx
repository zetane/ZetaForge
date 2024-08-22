import PromptMenu from "./PromptMenu";
import { Button } from "@carbon/react";

export default function Prompt({ children, index, pipelineId, blockId, onSelectPrompt }) {
  const handleClick = () => {
    onSelectPrompt(children);
  };

  return (
    <div className="prompt flex flex-row justify-between rounded-lg">
      <Button onClick={handleClick} kind="ghost" className="max-w-full grow rounded-lg">
        {children.prompt}
      </Button>
      <PromptMenu index={index} pipelineId={pipelineId} blockId={blockId} response={children.response} />
    </div>
  );
}
