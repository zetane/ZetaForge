import { useContext } from "react";
import ActivePrompt from "./ActivePrompt";
import Prompt from "./Prompt";
import { ChatHistoryContext } from "./ChatHistoryContext";
import { FileHandleContext } from "./FileHandleContext";

export default function PromptList() {
  const fileHandle = useContext(FileHandleContext);
  const chatHistory = useContext(ChatHistoryContext);
  const history = chatHistory.history ?? [];

  const activeIndex = history.length - 1;
  const previousPrompt = history.slice(0, -1);
  const activePrompt = history[activeIndex];
  const displayCounter = previousPrompt.length > 0

  return (
    <div className="flex h-full flex-col-reverse gap-5">
      <div className="p-2">
        <div className="pb-1.5">Latest Version</div>
        {activePrompt && (
          <ActivePrompt index={activeIndex}>{activePrompt}</ActivePrompt>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-row justify-between p-2">
          <div className="pb-4">
            <span>Version History </span>
            {displayCounter && (
              <span>({previousPrompt.length})</span>
            )}
          </div>
          {fileHandle.currentFile && (
            <div className="prompt-file-header">
              File: {fileHandle.currentFile.name}
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse grow gap-2 overflow-auto pr-1">
          {previousPrompt.reverse().map((prompt, index) => (
            <Prompt key={index} index={index}>
              {prompt}
            </Prompt>
          ))}
        </div>
      </div>
    </div>
  );
}

