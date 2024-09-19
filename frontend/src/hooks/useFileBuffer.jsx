import { trpc } from "@/utils/trpc";
import { useState, useRef } from "react";

export default function useFileBuffer(pipelineId, blockId, relativePath) {
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
      pipelineId,
      blockId: blockId,
      path: relativePath,
      content: fileContentBuffer.current,
    });
    setHasPendingChanges(false);
  };

  const updateSave = async (newValue) => {
    fileContentBuffer.current = newValue;
    await updateFileContent.mutateAsync({
      pipelineId,
      blockId: blockId,
      path: relativePath,
      content: newValue,
    });
    setHasPendingChanges(false);
  };

  const load = async (relativePath) => {
    fileContentBuffer.current = "";
    const content = await getFileContent.mutateAsync({
      pipelineId: pipelineId,
      blockId: blockId,
      path: relativePath,
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
