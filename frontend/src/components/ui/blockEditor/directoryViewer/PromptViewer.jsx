import { Button } from "@carbon/react";
import { Copy } from "@carbon/icons-react";
import { ViewerCodeMirror } from "./CodeMirrorComponents";
import { useContext } from "react";
import { SelectedPromptContext } from "./DirectoryViewer";
import { ChatHistoryContext } from "./DirectoryViewer";
import { FileBufferContext } from "./DirectoryViewer";
import { useAtom } from "jotai";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { blockEditorIdAtom } from "@/atoms/editorAtom";
import { FileHandleContext } from "./DirectoryViewer";
import { useCompileComputation } from "@/hooks/useCompileSpecs";

export default function PromptViewer() {
  const [pipeline] = useAtom(pipelineAtom);
  const [blockId] = useAtom(blockEditorIdAtom);
  const fileBuffer = useContext(FileBufferContext);
  const selectedPrompt = useContext(SelectedPromptContext);
  const chatHistory = useContext(ChatHistoryContext);
  const fileHandle = useContext(FileHandleContext);
  const compile = useCompileComputation();

  const handleAccept = async () => {
    chatHistory.addPrompt(selectedPrompt.prompt, selectedPrompt.response);
    await fileBuffer.updateSave(selectedPrompt.response);
    if (fileHandle.isComputation) {
      compile(pipeline.path, blockId);
    }
    selectedPrompt.unselect();
  };

  return (
    <div className="relative min-h-0 flex-1">
      <ViewerCodeMirror code={selectedPrompt.response} />
      <div className="absolute right-5 top-5 flex flex-row gap-4">
        <div className="view-only-tag grid content-center">View Only</div>
        <Button
          renderIcon={Copy}
          iconDescription="Make current"
          tooltipPosition="left"
          size="sm"
          onClick={handleAccept}
        >
          Duplicate to current
        </Button>
      </div>
    </div>
  );
}
