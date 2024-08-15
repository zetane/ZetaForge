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
  const utils = trpc.useUtils();
  const callAgent = trpc.block.callAgent.useMutation({
    onSuccess() {
      utils.chat.history.get.invalidate({
        pipelgneId: pipelineId,
        blockId: blockId,
      });
    },
  });
  const history = trpc.chat.history.get.useQuery({
    pipelineId: pipelineId,
    blockId: blockId,
  });
  const updateHistory = trpc.chat.history.update.useMutation({
    onSuccess(a) {
      // console.log(a);
      // utils.chat.history.get.invalidate({
      //   pipelgneId: pipelineId,
      //   blockId: blockId,
      // });
    },
    onMutate({ pipelineId, blockId, history }) {
      // utils.chat.history.get.cancel({
      //   pipelineId: pipelineId,
      //   blockId: blockId,
      // });
      // console.log(history.length);
      // utils.chat.history.get.setData(
      //   {
      //     pipelineId: pipelineId,
      //     blockId: blockId,
      //   },
      //   history,
      // );
      // console.log("mutate", utils.chat.history.get.getData({
      //   pipelineId: pipelineId,
      //   blockId: blockId,
      // }));
    },
    onSettled() {
      // utils.chat.history.get.invalidate({
      //   pipelgneId: pipelineId,
      //   blockId: blockId,
      // });
      //
      // console.log("settle", utils.chat.history.get.getData({
      //   pipelineId: pipelineId,
      //   blockId: blockId,
      // }));
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

    console.log(response);

    const newHistory = [
      ...history.data,
      {
        timestamp: Date.now(),
        prompt: newPrompt,
        response: response,
      },
    ];

    console.log(newHistory.length);

    await updateHistory.mutateAsync({
      pipelineId: pipelineId,
      blockId: blockId,
      history: newHistory,
    });

    utils.chat.history.get.setData(
      {
        pipelineId: pipelineId,
        blockId: blockId,
      },
      newHistory,
    );

    utils.chat.history.get.invalidate({
      pipelgneId: pipelineId,
      blockId: blockId,
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

  console.log("rendering", history.data.length);

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
