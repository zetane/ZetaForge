import { Button, OverflowMenu, OverflowMenuItem } from "@carbon/react";
import { useContext } from "react";
import { SelectedPromptContext } from "./SelectedPromptContext";
import { ChatHistoryContext } from "./ChatHistoryContext";
import { FileBufferContext } from "./FileBufferContext";
import { FileHandleContext } from "./FileHandleContext";

export default function ActivePrompt({ children, index }) {
  const selectedPrompt = useContext(SelectedPromptContext);
  const chatHistory = useContext(ChatHistoryContext);
  const fileBuffer = useContext(FileBufferContext);
  const fileHandle = useContext(FileHandleContext);

  const isLast = index === 0;

  const handleClick = () => {
    selectedPrompt.setSelectedPrompt(undefined);
  };

  const handleDelete = async () => {
    const newPrompt = chatHistory.history[index - 1];
    chatHistory.deletePrompt(index);
    await fileBuffer.updateSave(newPrompt.response);
    if (fileHandle.isComputation) {
      compile(pipeline.id, blockId);
    }
    selectedPrompt.setSelectedPrompt(undefined);
  };

  return (
    <div className="prompt-active flex justify-between rounded-lg border-2 border-solid relative group">
      <Button
        onClick={handleClick}
        kind="ghost"
        className="min-w-0 max-w-none flex-1 rounded-lg"
      >
        <span className="line-clamp-3 text-wrap w-11/12">{children.prompt}</span>
      </Button>
      <div className="absolute right-0 top-0 invisible group-hover:visible">
      <OverflowMenu
        className="rounded-lg"
        aria-label="overflow-menu"
        data-floating-menu-container="cds--header-panel"
        flipped
      >
        <OverflowMenuItem
          itemText="Delete"
          disabled={isLast}
          onClick={handleDelete}
        />
      </OverflowMenu>
      </div>
    </div>
  );
}
