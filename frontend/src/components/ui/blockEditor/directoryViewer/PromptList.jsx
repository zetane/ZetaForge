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
    <div className="flex h-full flex-col-reverse gap-5 p-3">
      <div>
        <div className="pb-1.5">Active Prompt</div>
        {activePrompt && (
          <ActivePrompt index={activeIndex}>{activePrompt}</ActivePrompt>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="pb-4">Prompts ({history.length})</div>
        <div className="flex flex-col gap-2 overflow-auto pr-1">
          {previousPrompt.map((prompt, index) => (
            <Prompt key={index} index={index}>
              {prompt}
            </Prompt>
          ))}
        </div>
      </div>
    </div>
  );
}
