import { trpc } from "@/utils/trpc";
import { useState, useRef } from "react";

export default function useFileBuffer(pipelinePath, blockId, relativePath) {
  const getFileContent = trpc.block.file.byPath.get.useMutation();
  const updateFileContent = trpc.block.file.byPath.update.useMutation();
  const fileContentBuffer = useRef("");
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const update = (newValue) => {
    fileContentBuffer.current = newValue;
    setHasPendingChanges(true);
  };

  const save = async () => {
    await updateFileContent.mutateAsync({
      pipelinePath,
      blockId: blockId,
      relPath: relativePath,
      content: fileContentBuffer.current,
    });
    setHasPendingChanges(false);
  };

  const updateSave = async (newValue) => {
    fileContentBuffer.current = newValue;
    await updateFileContent.mutateAsync({
      pipelinePath,
      blockId: blockId,
      relPath: relativePath,
      content: newValue,
    });
    setHasPendingChanges(false);
  };

  const load = async (relativePath) => {
    fileContentBuffer.current = "";
    const content = await getFileContent.mutateAsync({
      pipelinePath: pipelinePath,
      blockId: blockId,
      relPath: relativePath,
    });
    setHasPendingChanges(false);
    fileContentBuffer.current = content;
  };

  return {
    content: fileContentBuffer.current,
    hasPendingChanges,
    update,
    load,
    save,
    updateSave,
  };
}
