import { useContext } from "react";
import ActivePrompt from "./ActivePrompt";
import Prompt from "./Prompt";
import { ChatHistoryContext } from "./DirectoryViewer";
import { FileHandleContext } from "./DirectoryViewer";

export default function PromptList() {
  const fileHandle = useContext(FileHandleContext);
  const chatHistory = useContext(ChatHistoryContext);
  const history = chatHistory.history ?? [];

  const activeIndex = history.length - 1;
  const previousPrompt = history.slice(0, -1);
  const activePrompt = history[activeIndex];
  const displayCounter = previousPrompt.length > 0;

  return (
    <div className="flex h-full flex-col-reverse gap-5">
      <div className="p-2">
        <div className="text-nowrap pb-1.5">Latest Version</div>
        {activePrompt && (
          <ActivePrompt index={activeIndex}>{activePrompt}</ActivePrompt>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-row justify-between gap-4 p-2">
          <div className="text-nowrap pb-4 ">
            <span>Version History </span>
            {displayCounter && <span>({previousPrompt.length})</span>}
          </div>
          {fileHandle && (
            <div className="prompt-file-header text-nowrap">
              File: {fileHandle.name}
            </div>
          )}
        </div>
        <div className="flex grow flex-col-reverse gap-2 overflow-y-auto overflow-x-hidden px-2">
          {previousPrompt.reverse().map((prompt, index) => {
            const isFirst = index === previousPrompt.length - 1;
            return (
              <Prompt key={index} index={index} isFirst={isFirst}>
                {prompt}
              </Prompt>
            );
          })}
        </div>
      </div>
    </div>
  );
}
