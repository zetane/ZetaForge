import { Button, Loading } from "@carbon/react";
import { Bot, SendFilled } from "@carbon/icons-react";
import { openAIApiKeyAtom } from "@/atoms/apiKeysAtom";
import { useState, useRef } from "react";
import { useAtom } from "jotai";
import { trpc } from "@/utils/trpc";

export default function AgentPrompt({ pipelineId, blockId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [openAIApiKey] = useAtom(openAIApiKeyAtom);
  const [agentName] = useState("gpt-4_python_compute");
  const chatTextarea = useRef(null);
  const callAgent = trpc.block.callAgent.useMutation();
  const history = trpc.chat.history.get.useQuery({
    pipelineId: pipelineId,
    blockId: blockId,
  });
  const utils = trpc.useUtils();
  const updateHistory = trpc.chat.history.update.useMutation({
    onSuccess() {
      utils.chat.history.get.invalidate({
        pipelgneId: pipelineId,
        blockId: blockId,
      });
    },
  });

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

    await updateHistory.mutateAsync({
      blockPath: blockPath,
      history: [
        ...history.data,
        {
          timestamp: Date.now(),
          prompt: newPrompt,
          response: response,
        },
      ],
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
      <div className="inline-block p-2 absolute top-0 right-0">
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
