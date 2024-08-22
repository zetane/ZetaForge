import { Button, Loading } from "@carbon/react";
import { Bot, SendFilled } from "@carbon/icons-react";
import { openAIApiKeyAtom } from "@/atoms/apiKeysAtom";
import { useState, useRef } from "react";
import { useAtom } from "jotai";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { trpc } from "@/utils/trpc";

export default function AgentPrompt({ pipelineId, blockId, onGenerate }) {
  const [pipeline] = useAtom(pipelineAtom);
  const [isLoading, setIsLoading] = useState(false);
  const [openAIApiKey] = useAtom(openAIApiKeyAtom);
  const chatTextarea = useRef(null);
  const callAgent = trpc.block.callAgent.useMutation();
  const history = trpc.chat.history.get.useQuery({
    pipelineId: pipelineId,
    blockId: blockId,
  });
  const isViewBlock = pipeline?.data[blockId]?.information?.block_type === "view";
  const agentName = isViewBlock ? "gpt-4_python_view" : "gpt-4_python_compute";

  const handleSubmit = async (e) => {
    setIsLoading(true);
    e.preventDefault();
    const newPrompt = chatTextarea.current.value.trim();

    const response = await callAgent.mutateAsync({
      userMessage: newPrompt,
      agentName: agentName,
      conversationHistory: history.data,
      apiKey: openAIApiKey,
    });

    await onGenerate({
        timestamp: Date.now(),
        prompt: newPrompt,
        response: response,
      });

    chatTextarea.current.value = "";

    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="relative">
      <textarea
        className="block-editor-prompt-input relative"
        ref={chatTextarea}
        placeholder="Ask to generate code or modify your code"
        onKeyDown={handleKeyDown}
      />
      <div className="absolute right-0 top-0 inline-block p-2">
        <Bot size={24} className="align-middle" />
        <span className="text-md align-middle">{agentName}</span>
      </div>
      <div className="absolute bottom-2 right-1">
        {isLoading ? (
          <div className="prompt-spinner">
            <Loading
              active={true}
              description="Sending..."
              withOverlay={false}
            />
          </div>
        ) : (
          <Button
            className="rounded-full"
            iconDescription="Send Prompt"
            renderIcon={SendFilled}
            hasIconOnly
            onClick={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
