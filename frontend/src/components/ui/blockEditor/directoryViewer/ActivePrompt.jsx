import { Button, OverflowMenu } from "@carbon/react";
import { useContext } from "react";
import { SelectedPromptContext } from "./DirectoryViewer";
import { ChatHistoryContext } from "./DirectoryViewer";
import { FileBufferContext } from "./DirectoryViewer";
import { FileHandleContext } from "./DirectoryViewer";
import OverflowMenuIconItem from "../../OverflowMenuIconItem";
import { TrashCan } from "@carbon/icons-react";
import { useAtom } from "jotai";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { blockEditorIdAtom } from "@/atoms/editorAtom";
import { useCompileComputation } from "@/hooks/useCompileSpecs";

export default function ActivePrompt({ children, index }) {
  const selectedPrompt = useContext(SelectedPromptContext);
  const chatHistory = useContext(ChatHistoryContext);
  const fileBuffer = useContext(FileBufferContext);
  const fileHandle = useContext(FileHandleContext);
  const [pipeline] = useAtom(pipelineAtom);
  const [blockId] = useAtom(blockEditorIdAtom);
  const compile = useCompileComputation();

  const isFirst = index === 0;
  const borderStyle = !selectedPrompt.selected ? " prompt-selected" : "";

  const handleClick = () => {
    selectedPrompt.unselect();
  };

  const handleDelete = async () => {
    const newPrompt = chatHistory.history[index - 1];
    chatHistory.deletePrompt(index);
    await fileBuffer.updateSave(newPrompt.response);
    if (fileHandle.isComputation) {
      compile(pipeline.path, blockId);
    }
    selectedPrompt.unselect();
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
        className="disable-focus disable-hover-color min-w-0 max-w-none flex-1 rounded-lg"
      >
        <span className="prompt-text line-clamp-3 w-11/12 text-wrap">
          {children.prompt}
        </span>
      </Button>
      <div className="invisible absolute right-0 top-0 group-hover:visible">
        <OverflowMenu
          className="disable-focus rounded-lg"
          aria-label="overflow-menu"
          flipped
        >
          <OverflowMenuIconItem
            disabled={isFirst}
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
