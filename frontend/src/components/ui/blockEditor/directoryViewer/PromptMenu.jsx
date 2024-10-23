import { OverflowMenu } from "@carbon/react";
import { useContext } from "react";
import { ChatHistoryContext } from "./DirectoryViewer";
import { SelectedPromptContext } from "./DirectoryViewer";
import { FileBufferContext } from "./DirectoryViewer";
import { useAtom } from "jotai";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { blockEditorIdAtom } from "@/atoms/editorAtom";
import { useCompileComputation } from "@/hooks/useCompileSpecs";
import { FileHandleContext } from "./DirectoryViewer";
import { Copy, TrashCan } from "@carbon/icons-react";
import OverflowMenuIconItem from "../../OverflowMenuIconItem";

export default function PromptMenu({ index, prompt, isFirst }) {
  const [pipeline] = useAtom(pipelineAtom);
  const [blockId] = useAtom(blockEditorIdAtom);
  const chatHistory = useContext(ChatHistoryContext);
  const selectedPrompt = useContext(SelectedPromptContext);
  const fileBuffer = useContext(FileBufferContext);
  const fileHandle = useContext(FileHandleContext);
  const compile = useCompileComputation();

  const handleDelete = async () => {
    chatHistory.deletePrompt(index);
  };

  const handleDuplicate = async () => {
    chatHistory.addPrompt(prompt.prompt, prompt.response);
    await fileBuffer.updateSave(prompt.response);
    if (fileHandle.isComputation) {
      compile(pipeline.path, blockId);
    }
    selectedPrompt.unselect();
  };

  return (
    <OverflowMenu
      className="disable-focus rounded-lg"
      aria-label="overflow-menu"
      flipped
    >
      <OverflowMenuIconItem
        className="disable-focus"
        icon={Copy}
        onClick={handleDuplicate}
      >
        Duplicate to current
      </OverflowMenuIconItem>
      <OverflowMenuIconItem
        className="disabled-focus"
        icon={TrashCan}
        disabled={isFirst}
        onClick={handleDelete}
      >
        Delete
      </OverflowMenuIconItem>
    </OverflowMenu>
  );
}
