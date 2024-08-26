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

export default function PromptMenu({ index, prompt }) {
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

  const handleDuplicate = async  () => {
    chatHistory.addPrompt(prompt);
    await fileBuffer.updateSave(prompt.response);
    console.log(fileHandle.isComputation);
    if (fileHandle.isComputation) {
      compile(pipeline.id, blockId);
    }
    selectedPrompt.setSelectedPrompt(undefined)
  };

  return (
    <OverflowMenu
      className="rounded-lg"
      aria-label="overflow-menu"
      data-floating-menu-container="cds--header-panel"
      flipped
    >
      <OverflowMenuItem
        itemText="Duplicate to current"
        onClick={handleDuplicate}
      />
      <OverflowMenuItem itemText="Delete" onClick={handleDelete} />
    </OverflowMenu>
  );
}

