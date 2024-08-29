import { Button, OverflowMenu} from "@carbon/react";
import { useContext } from "react";
import { SelectedPromptContext } from "./SelectedPromptContext";
import { ChatHistoryContext } from "./ChatHistoryContext";
import { FileBufferContext } from "./FileBufferContext";
import { FileHandleContext } from "./FileHandleContext";
import OverflowMenuIconItem from "../../OverflowMenuIconItem";
import { TrashCan } from "@carbon/icons-react";
 
export default function ActivePrompt({ children, index }) {
  const selectedPrompt = useContext(SelectedPromptContext);
  const chatHistory = useContext(ChatHistoryContext);
  const fileBuffer = useContext(FileBufferContext);
  const fileHandle = useContext(FileHandleContext);

  const isLast = index === 0;
  const isSelected = !selectedPrompt.selectedPrompt;
  const borderStyle = isSelected ? " prompt-selected" : "";

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
    <div
      className={
        "prompt-active group relative flex justify-between rounded-lg" +
        borderStyle
      }
   >
      <Button
        onClick={handleClick}
        kind="ghost"
        className="min-w-0 max-w-none flex-1 rounded-lg"
      >
        <span className="line-clamp-3 w-11/12 text-wrap">
          {children.prompt}
        </span>
      </Button>
      <div className="invisible absolute right-0 top-0 group-hover:visible">
        <OverflowMenu
          className="rounded-lg"
          aria-label="overflow-menu"
          data-floating-menu-container="cds--header-panel"
          flipped
        >
          <OverflowMenuIconItem
            disabled={isLast}
            icon={TrashCan}
            onClick={handleDelete}
          >
            Delete
          </OverflowMenuIconItem>
        </OverflowMenu>
      </div>
    </div>
  );
}
