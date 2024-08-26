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

  const addPrompt = async (entry) => {
    const newHistory = [...history.data, entry];

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
  }

  const computeNewIndex = (deleted, selectedIndex) => {
    return selectedIndex - Math.min(1, Math.sign(selectedIndex - deleted) + 1);
  }

  return {
    history: history?.data,
    addPrompt: addPrompt,
    deletePrompt: deletePrompt,
  }
}
