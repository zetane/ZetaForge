import { Button } from "@carbon/react";
import { Save } from "@carbon/icons-react";
import { EditorCodeMirror } from "./CodeMirrorComponents";
import { useContext, useState } from "react";
import { FileBufferContext } from "./FileBufferContext";
import { ChatHistoryContext } from "./ChatHistoryContext";
import { FileHandleContext } from "./FileHandleContext";
import { useCompileComputation } from "@/hooks/useCompileSpecs";
import { useAtomValue } from "jotai";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { blockEditorIdAtom } from "@/atoms/editorAtom";

const MANUAL_EDIT_PROMPT = "Manual Edit";
export default function CodeManualEditor() {
  const pipeline = useAtomValue(pipelineAtom);
  const blockId = useAtomValue(blockEditorIdAtom);
  const fileHandle = useContext(FileHandleContext);
  const fileBuffer = useContext(FileBufferContext);
  const chatHistory = useContext(ChatHistoryContext);
  const compile = useCompileComputation();
  const [isLoading, setIsLoading] = useState(false);

  const saveDisabled = isLoading || !fileBuffer.hasPendingChanges;

  const handleChange = (value) => {
    fileBuffer.update(value);
  };

  const handleSave = async () => {
    setIsLoading(true);
    await fileBuffer.save();
    if (fileHandle.isComputation) {
      await chatHistory.addPrompt({
        timestamp: Date.now(),
        prompt: MANUAL_EDIT_PROMPT,
        response: fileBuffer.content,
      });
      compile(pipeline.id, blockId);
    }
    setIsLoading(false);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <EditorCodeMirror
        code={fileBuffer.content ?? ""}
        onChange={handleChange}
      />
      <div className="absolute right-5 top-5">
        <Button
          renderIcon={Save}
          iconDescription="Save code"
          tooltipPosition="left"
          hasIconOnly
          size="md"
          onClick={handleSave}
          disabled={saveDisabled}
        />
      </div>
    </div>
  );
}
