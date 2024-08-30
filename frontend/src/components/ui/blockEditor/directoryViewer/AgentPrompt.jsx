import { Button, Loading } from "@carbon/react";
import { Bot, SendFilled } from "@carbon/icons-react";
import { openAIApiKeyAtom } from "@/atoms/apiKeysAtom";
import { useState, useContext } from "react";
import { useAtom } from "jotai";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { trpc } from "@/utils/trpc";
import { ChatHistoryContext } from "./ChatHistoryContext";
import { blockEditorIdAtom } from "@/atoms/editorAtom";
import { SelectedPromptContext } from "./SelectedPromptContext";
import { FileBufferContext } from "./FileBufferContext";
import { FileHandleContext } from "./FileHandleContext";
import { useCompileComputation } from "@/hooks/useCompileSpecs";
import useDebounce from "@/hooks/useDebounce";

export default function AgentPrompt() {
  const [pipeline] = useAtom(pipelineAtom);
  const [blockId] = useAtom(blockEditorIdAtom);
  const [isLoading, setIsLoading] = useState(false);
  const [openAIApiKey] = useAtom(openAIApiKeyAtom);
  const [textArea, setTextArea] = useState("");
  const setTextAreaDebounced = useDebounce(setTextArea);
  const callAgent = trpc.block.callAgent.useMutation();
  const chatHistory = useContext(ChatHistoryContext);
  const selectedPrompt = useContext(SelectedPromptContext);
  const fileBuffer = useContext(FileBufferContext);
  const fileHandle = useContext(FileHandleContext);
  const compile = useCompileComputation();

  const isViewBlock =
    pipeline?.data[blockId]?.information?.block_type === "view";
  const agentName = isViewBlock ? "gpt-4_python_view" : "gpt-4_python_compute";

  const handleTextAreaChange = (e) => {
    const newValue = e.target.value;
    setTextAreaDebounced(newValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const newPrompt = textArea.trim();
    const response = await callAgent.mutateAsync({
      userMessage: newPrompt,
      agentName: agentName,
      conversationHistory: chatHistory.history,
      apiKey: openAIApiKey,
    });

    chatHistory.addPrompt(newPrompt, response);
    await fileBuffer.updateSave(response);
    if (fileHandle.isComputation) {
      compile(pipeline.id, blockId);
    }

    selectedPrompt.unselect();

    setTextArea("");
    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="px-40 py-3">
      <div className="relative">
        <textarea
          className="block-editor-prompt-input relative"
          placeholder="Ask to generate new code or modify the latest version"
          onKeyDown={handleKeyDown}
          value={textArea}
          onChange={handleTextAreaChange}
        >
        </textarea>
        <div className="absolute bottom-3 right-4">
          <Button
            className="rounded-full"
            iconDescription="Send Prompt"
            renderIcon={isLoading ? Spinner : SendFilled}
            hasIconOnly
            disabled={!textArea}
            onClick={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <Loading withOverlay={false} small/>
}
