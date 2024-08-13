import PromptMenu from "./PromptMenu";
import { Button } from "@carbon/react";

export default function Prompt({ children, index, pipelineId, blockId, response, onSelectPrompt }) {
  const handleClick = () => {
    onSelectPrompt(response);
  };

  return (
    <div className="prompt flex flex-row justify-between rounded-lg">
      <Button onClick={handleClick} kind="ghost" className="max-w-full grow rounded-lg">
        {children}
      </Button>
      <PromptMenu index={index} pipelineId={pipelineId} blockId={blockId} response={response} />
    </div>
  );
}
