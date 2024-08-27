import { trpc } from "@/utils/trpc";

export default function useChatHistory(pipelineId, blockId){
  const utils = trpc.useUtils();
  const history = trpc.chat.history.get.useQuery({
    pipelineId: pipelineId,
    blockId: blockId,
  });
  const updateHistory = trpc.chat.history.update.useMutation();
  const selectedIndex = trpc.chat.index.get.useQuery({ pipelineId, blockId });
  const updateIndex = trpc.chat.index.update.useMutation({
    onSuccess() {
      utils.chat.index.get.invalidate({ pipelineId, blockId });
    },
  });

  const addPrompt = async (prompt, response) => {
    const newEntry = {
      timestamp: Date.now(),
      prompt: prompt,
      response: response,
    }
    const newHistory = [...history.data, newEntry];

    await updateHistory.mutateAsync({
      pipelineId: pipelineId,
      blockId: blockId,
      history: newHistory,
    });

    eagerUpdateHistory(newHistory);
  };

  const deletePrompt = async (index) => {
    const newHistory = history.data.filter((_, i) => i !== index);
    const newIndex = computeNewIndex(index, selectedIndex.data);
    await updateHistory.mutateAsync({
      pipelineId: pipelineId,
      blockId: blockId,
      history: newHistory,
    });
    await updateIndex.mutateAsync({
      pipelineId: pipelineId,
      blockId: blockId,
      index: newIndex,
    });
    eagerUpdateHistory(newHistory);
  }

  const computeNewIndex = (deleted, selectedIndex) => {
    return selectedIndex - Math.min(1, Math.sign(selectedIndex - deleted) + 1);
  }

  const eagerUpdateHistory = (newHistory) => {
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
  }

  return {
    history: history?.data,
    addPrompt: addPrompt,
    deletePrompt: deletePrompt,
  }
}
