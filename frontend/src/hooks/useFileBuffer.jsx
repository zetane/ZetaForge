import { trpc } from "@/utils/trpc";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";

export default function useFileBuffer(pipelinePath, blockId, relativePath) {
  const getFileContent = trpc.block.file.byPath.get.useMutation();
  const updateFileContent = trpc.block.file.byPath.update.useMutation();
  const [content, setContent] = useState("");
  const setContentDebounced = useDebouncedCallback(setContent, 100);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const update = (newValue) => {
    setContentDebounced(newValue);
    setHasPendingChanges(true);
  };

  const save = async () => {
    await updateFileContent.mutateAsync({
      pipelinePath,
      blockId: blockId,
      relPath: relativePath,
      content: content,
    });
    setHasPendingChanges(false);
  };

  const updateSave = async (newValue) => {
    setContent(newValue);
    await updateFileContent.mutateAsync({
      pipelinePath,
      blockId: blockId,
      relPath: relativePath,
      content: newValue,
    });
    setHasPendingChanges(false);
  };

  const load = async (relativePath) => {
    const content = await getFileContent.mutateAsync({
      pipelinePath: pipelinePath,
      blockId: blockId,
      relPath: relativePath,
    });
    setHasPendingChanges(false);
    setContent(content);
  };

  return {
    content,
    hasPendingChanges,
    update,
    load,
    save,
    updateSave,
  };
}
