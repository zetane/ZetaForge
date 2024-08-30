import { OverflowMenu, OverflowMenuItem } from "@carbon/react";
import { useContext } from "react";
import { ChatHistoryContext } from "./ChatHistoryContext";
import { SelectedPromptContext } from "./SelectedPromptContext";
import { FileBufferContext } from "./FileBufferContext";
import { useAtom } from "jotai";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { blockEditorIdAtom } from "@/atoms/editorAtom";
import { useCompileComputation } from "@/hooks/useCompileSpecs";
import { FileHandleContext } from "./FileHandleContext";
import { Copy, TrashCan } from "@carbon/icons-react";
import OverflowMenuIconItem from "../../OverflowMenuIconItem";

export default function PromptMenu({ index, prompt }) {
  const [pipeline] = useAtom(pipelineAtom);
  const [blockId] = useAtom(blockEditorIdAtom);
  const chatHistory = useContext(ChatHistoryContext);
  const selectedPrompt = useContext(SelectedPromptContext);
  const fileBuffer = useContext(FileBufferContext);
  const fileHandle = useContext(FileHandleContext);
  const compile = useCompileComputation();

  const isLast = index === 0;

  const handleDelete = async () => {
    chatHistory.deletePrompt(index);
  };

  const handleDuplicate = async () => {
    chatHistory.addPrompt(prompt.prompt, prompt.response);
    await fileBuffer.updateSave(prompt.response);
    if (fileHandle.isComputation) {
      compile(pipeline.id, blockId);
    }
    selectedPrompt.unselect();
  };

  return (
    <OverflowMenu
      className="disable-focus rounded-lg"
      aria-label="overflow-menu"
      data-floating-menu-container="cds--header-panel"
      flipped
    >
      <OverflowMenuIconItem icon={Copy} onClick={handleDuplicate}>
        Duplicate to current
      </OverflowMenuIconItem>
      <OverflowMenuIconItem
        icon={TrashCan}
        disabled={isLast}
        onClick={handleDelete}
      >
        Delete
      </OverflowMenuIconItem>
    </OverflowMenu>
  );
}
