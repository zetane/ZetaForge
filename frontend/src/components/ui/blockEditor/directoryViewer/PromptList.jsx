import Prompt from "./Prompt";
import { trpc } from "@/utils/trpc";

export default function PromptList({ pipelineId, blockId, onSelectPrompt}) {
  const history = trpc.chat.history.get.useQuery({ 
    pipelineId: pipelineId,
    blockId: blockId
  });
  const historyData = history?.data ?? [];

  // TODO make the list scrollable
  return (
    <div className="p-3">
      <div className="pb-5">Prompts ({historyData.length})</div>
      <div className="flex flex-col gap-2">
        {historyData.map(({ prompt, response }, index) => (
          <Prompt key={index} index={index} pipelineId={pipelineId} blockId={blockId} response={response} onSelectPrompt={onSelectPrompt}>{prompt}</Prompt>
        ))}
      </div>
    </div>
  );
}
