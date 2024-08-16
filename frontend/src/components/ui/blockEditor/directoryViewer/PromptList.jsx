import Prompt from "./Prompt";
import { trpc } from "@/utils/trpc";

export default function PromptList({ pipelineId, blockId, onSelectPrompt}) {
  const history = trpc.chat.history.get.useQuery({ 
    pipelineId: pipelineId,
    blockId: blockId
  });
  const historyData = history?.data ?? [];

  return (
    <div className="p-3 flex flex-col max-h-full gap-5">
      <div>Prompts ({historyData.length})</div>
      <div className="flex flex-col gap-2 pr-1 flex-1 min-h-0 overflow-auto">
        {historyData.map(({ prompt, response }, index) => (
          <Prompt key={index} index={index} pipelineId={pipelineId} blockId={blockId} response={response} onSelectPrompt={onSelectPrompt}>{prompt}</Prompt>
        ))}
      </div>
    </div>
  );
}
