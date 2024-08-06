import { IconButton } from "@carbon/react";
import { Bot, SendFilled } from "@carbon/icons-react"
import { openAIApiKeyAtom } from "@/atoms/apiKeysAtom";
import { useState, useRef } from "react";
import { useAtom } from "jotai";
import { trpc } from "@/utils/trpc";
import { blockEditorRootAtom } from "@/atoms/editorAtom";

export default function AgentPrompt() {
  const [isLoading, setIsLoading] = useState(false);
  const [openAIApiKey] = useAtom(openAIApiKeyAtom);
  const [blockPath] = useAtom(blockEditorRootAtom); // TODO remove this
  const [agentName] = useState("gpt-4_python_compute");
  const chatTextarea = useRef(null);
  const callAgent = trpc.block.callAgent.useMutation();
  const history = trpc.chat.history.get.useQuery({ blockPath });
  const utils = trpc.useUtils();
  const updateHistory = trpc.chat.history.update.useMutation({
    onSuccess() {
      utils.chat.history.get.invalidate({ blockPath });
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


  return (
    <div className="relative">
      <div className="text-right">
        <div className="inline-block p-2">
          <Bot size={24} className="align-middle" />
          <span className="text-md align-middle">{agentName}</span>
        </div>
        <textarea
          className="block-editor-prompt-input w-full resize-none p-2"
          ref={chatTextarea}
          placeholder="Ask to generate code or modify last code"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
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
          <IconButton
            iconDescription="Send Prompt"
            label="Send Prompt"
            kind="ghost"
            onClick={handleSubmit}
          >
            <SendFilled size={24} />
          </IconButton>
        )}
      </div>
    </div>
  );
}
