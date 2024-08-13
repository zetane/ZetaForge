import { OverflowMenu, OverflowMenuItem } from "@carbon/react";
import { trpc } from "@/utils/trpc";
import { Delete } from "@carbon/icons-react";

export default function PromptMenu({ index, pipelineId, blockId }) {
  const utils = trpc.useUtils();
  const history = trpc.chat.history.get.useQuery({ pipelineId, blockId });
  const updateHistory = trpc.chat.history.update.useMutation({
    onSuccess() {
      utils.chat.history.get.invalidate({ pipelineId, blockId });
    },
  });

  const selectedIndex = trpc.chat.index.get.useQuery({ pipelineId, blockId });
  const updateIndex = trpc.chat.index.update.useMutation({
    onSuccess() {
      utils.chat.index.get.invalidate({ pipelineId, blockId });
    },
  });

  const handleDelete = async () => {
    const newHistory = history.data.filter((_, i) => i !== index);
    console.log(newHistory);
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
  };

  function computeNewIndex(deleted, selectedIndex) {
    return selectedIndex - Math.min(1, Math.sign(selectedIndex - deleted) + 1);
  }

  return (
    <OverflowMenu
      className="rounded-lg"
      aria-label="overflow-menu"
      data-floating-menu-container="cds--header-panel"
      flipped
    >
      <OverflowMenuItem itemText="Delete" isDelete onClick={handleDelete}>
        <Delete/>
      </OverflowMenuItem>
    </OverflowMenu>
  );
}

