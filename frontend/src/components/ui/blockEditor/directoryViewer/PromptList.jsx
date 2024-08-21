import ActivePrompt from "./ActivePrompt";
import Prompt from "./Prompt";
import { trpc } from "@/utils/trpc";

export default function PromptList({
  pipelineId,
  blockId,
  onSelectPrompt,
  onSelectActive,
}) {
  const history = trpc.chat.history.get.useQuery({
    pipelineId: pipelineId,
    blockId: blockId,
  });
  const historyData = history?.data ?? [];

  const previousPrompt = historyData.slice(0, -1);
  const activePrompt = historyData.at(-1);

  return (
    <div className="flex h-full flex-col gap-5 p-3">
      <div>Prompts ({historyData.length})</div>
      <div className="flex min-h-0 flex-col gap-2 overflow-auto pr-1">
        {previousPrompt.map(({ prompt, response }, index) => (
          <Prompt
            key={index}
            index={index}
            pipelineId={pipelineId}
            blockId={blockId}
            response={response}
            onSelectPrompt={onSelectPrompt}
          >
            {prompt}
          </Prompt>
        ))}
      </div>
      <div>Active Prompt</div>
      {activePrompt && (
        <ActivePrompt onSelectActive={onSelectActive}>
          {activePrompt.prompt}
        </ActivePrompt>
      )}
    </div>
  );
}
