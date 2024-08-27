import { useContext } from "react";
import ActivePrompt from "./ActivePrompt";
import Prompt from "./Prompt";
import { ChatHistoryContext } from "./ChatHistoryContext";

export default function PromptList() {
  const chatHistory = useContext(ChatHistoryContext);
  const history = chatHistory.history ?? [];

  const activeIndex = history.length - 1;
  const previousPrompt = history.slice(0, -1);
  const activePrompt = history[activeIndex];

  return (
    <div className="flex h-full flex-col gap-5 p-3">
      <div>Prompts ({history.length})</div>
      <div className="flex min-h-0 flex-col gap-2 overflow-auto pr-1">
        {previousPrompt.map((prompt, index) => (
          <Prompt key={index} index={index}>
            {prompt}
          </Prompt>
        ))}
      </div>
      <div>Active Prompt</div>
      {activePrompt && (
        <ActivePrompt index={activeIndex}>{activePrompt}</ActivePrompt>
      )}
    </div>
  );
}
