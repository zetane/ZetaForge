import { trpc } from "@/utils/trpc";
import { useEffect, useState } from "react";
import { useCompileComputation } from "@/hooks/useCompileSpecs";
import { useAtomValue } from "jotai";
import { openAIApiKeyAtom } from "@/atoms/apiKeysAtom";
import AgentPrompt from "./AgentPrompt";
import PromptViewer from "./PromptViewer";
import CodeManualEditor from "./CodeManualEditor";
import useDebounce from "@/hooks/useDebounce";
import ChatHistory from "@/state/ChatHistory";

const MANUAL_EDIT_PROMPT = "Manual edit"; //TODO make sure this is the right prompt
export default function CodeEditor({
  pipelineId,
  blockId,
  currentFile,
  prompt,
  onAddPrompt,
}) {
  const openAIApiKey = useAtomValue(openAIApiKeyAtom);
  const utils = trpc.useUtils();
  const getFileContent = trpc.block.file.byPath.get.useMutation();
  const updateFileContent = trpc.block.file.byPath.update.useMutation();
  const history = trpc.chat.history.get.useQuery({
    pipelineId: pipelineId,
    blockId: blockId,
  });
  const updateHistory = trpc.chat.history.update.useMutation();
  const [fileContentBuffer, setFileContentBuffer] = useState();
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const setFileContentBufferDebounced = useDebounce(setFileContentBuffer, 100);
  const compile = useCompileComputation();

  const isComputation = currentFile.name === "computations.py";
  const displayAgentPrompt = isComputation && openAIApiKey;
  const promptResponse = prompt?.response;

  useEffect(() => {
    const fetchFileContent = async () => {
      const content = await getFileContent.mutateAsync({
        pipelineId: pipelineId,
        blockId: blockId,
        path: currentFile.relativePath,
      });
      setFileContentBuffer(content);
      setHasPendingChanges(false);
    };

    fetchFileContent();
  }, []);

  const handleChange = (newValue) => {
    setFileContentBufferDebounced(newValue);
    setHasPendingChanges(true)
  };

  const handleSave = async () => {
    await updateFileContent.mutateAsync({
      pipelineId,
      blockId: blockId,
      path: currentFile.relativePath,
      content: fileContentBuffer,
    });
    setHasPendingChanges(false);

    if (isComputation) {
      compile(pipelineId, blockId);
      await addPrompt({
        timestamp: Date.now(),
        prompt: MANUAL_EDIT_PROMPT,
        response: fileContentBuffer,
      });
    }
  };

  const handleAcceptPrompt = async () => {
    setFileContentBuffer(prompt.response);

    await updateFileContent.mutateAsync({
      pipelineId,
      blockId: blockId,
      path: currentFile.relativePath,
      content: fileContentBuffer,
    });
    setHasPendingChanges(false);


    compile(pipelineId, blockId);
    addPrompt(prompt);
    onAddPrompt();
  };

  const handleGenerate = async (generatedPrompt) => {
    setFileContentBuffer(generatedPrompt.response);

    await updateFileContent.mutateAsync({
      pipelineId,
      blockId: blockId,
      path: currentFile.relativePath,
      content: fileContentBuffer,
    });
    setHasPendingChanges(false);

    compile(pipelineId, blockId);
    addPrompt(generatedPrompt);
    onAddPrompt();
  };

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
          hasPendingChanges={hasPendingChanges}
          onChange={handleChange}
          onSave={handleSave}
        />
      )}
      {displayAgentPrompt && (
        <AgentPrompt
          pipelineId={pipelineId}
          blockId={blockId}
          onGenerate={handleGenerate}
        />
      )}
    </div>
  );
}
