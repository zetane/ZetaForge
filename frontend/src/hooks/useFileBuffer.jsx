import { trpc } from "@/utils/trpc";
import { useState } from "react";
import useDebounce from "./useDebounce";

export default function useFileBuffer(pipelineId, blockId, fileHandle) {
  const getFileContent = trpc.block.file.byPath.get.useMutation();
  const updateFileContent = trpc.block.file.byPath.update.useMutation();
  const [fileContentBuffer, setFileContentBuffer] = useState();
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const setFileContentBufferDebounced = useDebounce(setFileContentBuffer, 100);

  const update = (newValue) => {
    setFileContentBufferDebounced(newValue);
    setHasPendingChanges(true);
  };

  const save = async () => {
    await updateFileContent.mutateAsync({
      pipelineId,
      blockId: blockId,
      path: fileHandle.relativePath,
      content: fileContentBuffer,
    });
    setHasPendingChanges(false);
  };

  const updateSave = async (newValue) => {
    setFileContentBuffer(newValue);
    await updateFileContent.mutateAsync({
      pipelineId,
      blockId: blockId,
      path: fileHandle.relativePath,
      content: newValue,
    });
    setHasPendingChanges(false);
  };

  const load = async () => {
    let content = "";
    if (fileHandle.isSelected && fileHandle.read) {
      content = await getFileContent.mutateAsync({
        pipelineId: pipelineId,
        blockId: blockId,
        path: fileHandle.relativePath,
      });
    }
    setHasPendingChanges(false);
    setFileContentBuffer(content);
  };

  return {
    content: fileContentBuffer,
    hasPendingChanges: hasPendingChanges,
    update: update,
    load: load,
    save: save,
    updateSave: updateSave,
  };
}