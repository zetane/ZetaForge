import { trpc } from "@/utils/trpc";
import { useEffect, useState } from "react";
import { useCompileComputation } from "@/hooks/useCompileSpecs";
import { useAtomValue } from "jotai";
import { openAIApiKeyAtom } from "@/atoms/apiKeysAtom";
import AgentPrompt from "./AgentPrompt";
import PromptViewer from "./PromptViewer";
import CodeManualEditor from "./CodeManualEditor";
import useDebounce from "@/hooks/useDebounce";

export default function CodeEditor({
  pipelineId,
  blockId,
  currentFile,
  promptResponse,
  onAcceptPrompt,
}) {
  const openAIApiKey = useAtomValue(openAIApiKeyAtom);
  const getFileContent = trpc.block.file.byPath.get.useMutation();
  const updateFileContent = trpc.block.file.byPath.update.useMutation();
  const [fileContentBuffer, setFileContentBuffer] = useState();
  const setFileContentBufferDebounced = useDebounce(setFileContentBuffer, 100);
  const compile = useCompileComputation();

  const isComputation = currentFile.name === "computations.py";
  const displayAgentPrompt = isComputation && openAIApiKey;

  useEffect(() => {
    const fetchFileContent = async () => {
      const content = await getFileContent.mutateAsync({
        pipelineId: pipelineId,
        blockId: blockId,
        path: currentFile.relativePath,
      });
      setFileContentBuffer(content);
    };

    fetchFileContent();
  }, []);

  const handleSave = async () => {
    await updateFileContent.mutateAsync({
      pipelineId,
      blockId: blockId,
      path: currentFile.relativePath,
      content: fileContentBuffer,
    });

    if (isComputation) {
      compile(pipelineId, blockId);
    }
  };

  const handleChange = (newValue) => {
    setFileContentBufferDebounced(newValue);
  };

  const handleAcceptPrompt = () => {
    setFileContentBuffer(promptResponse);
    onAcceptPrompt();
  };

  return (
    <div className="flex h-full flex-col gap-8">
      {promptResponse ? (
        <PromptViewer
          response={promptResponse}
          onAcceptPrompt={handleAcceptPrompt}
        />
      ) : (
        <CodeManualEditor
          code={fileContentBuffer}
          onChange={handleChange}
          onSave={handleSave}
        />
      )}
      {displayAgentPrompt && (
        <AgentPrompt pipelineId={pipelineId} blockId={blockId} />
      )}
    </div>
  );
}
