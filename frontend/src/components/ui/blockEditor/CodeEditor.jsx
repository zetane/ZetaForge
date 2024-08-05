import { ViewerCodeMirror, EditorCodeMirror } from "./CodeMirrorComponents";
import { Button, Modal, IconButton, Loading } from "@carbon/react";
import { Save, SendFilled, Bot } from "@carbon/icons-react";
import {
  BLOCK_SPECS_FILE_NAME,
  CHAT_HISTORY_FILE_NAME,
} from "@/utils/constants";
import { useState, useRef } from "react";
import { trpc } from "@/utils/trpc";
import { useAtom } from "jotai";
import { useImmerAtom } from "jotai-immer";
import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { openAIApiKeyAtom } from "@/atoms/apiKeysAtom";
import { blockEditorRootAtom } from "@/atoms/editorAtom";
import { updateSpecs } from "@/utils/specs";
import { compilationErrorToastAtom } from "@/atoms/compilationErrorToast";

const EDIT_ONLY_FILES = [BLOCK_SPECS_FILE_NAME, CHAT_HISTORY_FILE_NAME];
export default function CodeEditor({
  pipelineId,
  blockId,
  currentFile,
  setCurrentFile,
  fileSystem,
}) {
  const serverAddress = "http://localhost:3330";
  const [blockPath] = useAtom(blockEditorRootAtom);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [editor] = useAtom(drawflowEditorAtom);
  const compileComputation = trpc.compileComputation.useMutation();
  const saveBlockSpecs = trpc.saveBlockSpecs.useMutation();
  const [isLoading, setIsLoading] = useState(false);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [openAIApiKey] = useAtom(openAIApiKeyAtom);
  const [agentName] = useState("gpt-4_python_compute");
  const chatTextarea = useRef(null);
  const [, setCompilationErrorToast] = useAtom(compilationErrorToastAtom);
  const history = trpc.chat.history.get.useQuery({ blockPath });
  const utils = trpc.useUtils();
  const updateHistory = trpc.chat.history.update.useMutation({
    onSuccess() {
      utils.chat.history.get.invalidate({ blockPath });
    },
  });
  const fileContent = trpc.block.file.byPath.get.useQuery({
    pipelineId: pipelineId,
    blockId: blockId,
    path: currentFile.relativePath,
  });
  const updateFileContent = trpc.block.file.byPath.update.useMutation();
  const [fileContentBuffer, setFileContentBuffer] = useState(fileContent.data);
  const callAgent = trpc.block.callAgent.useMutation();

  const isComputation = currentFile.relativePath.endsWith("computations.py");

  const saveChanges = async () => {
    await updateFileContent.mutateAsync({
      pipelineId,
      blockId: blockId,
      path: currentFile.relativePath,
      content: fileContentBuffer,
    });

    if (isComputation) {
      try {
        const newSpecsIO = await compileComputation.mutateAsync({
          pipelineId: pipelineId,
          blockId: blockId,
        });
        const newSpecs = await updateSpecs(
          blockId,
          newSpecsIO,
          pipeline.data,
          editor,
        );
        setPipeline((draft) => {
          draft.data[blockKey] = newSpecs;
        });
        await saveBlockSpecs.mutateAsync({
          blockPath: blockPath,
          blockSpecs: newSpecs,
        });
      } catch (error) {
        console.error(error);
        setCompilationErrorToast(true);
      }
    }
  };

  const handleModalConfirm = (e) => {
    saveChanges(e);
    if (pendingFile) {
      const relPath = pendingFile.replaceAll("\\", "/");
      const pathSegments = relPath.split("/");
      let fileContent = fileSystem;

      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];
        if (i === pathSegments.length - 1) {
          fileContent = fileContent[segment].content;
        } else {
          fileContent = fileContent[segment].content;
        }
      }

      setCurrentFile({ path: pendingFile, content: fileContent });
    }
    setIsModalOpen(false);
    setPendingFile(null);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
  };

  const onChange = (newValue) => {
    setFileContentBuffer(newValue);
  };

  const recordCode = (promptToRecord, codeToRecord) => {
    updateHistory.mutateAsync({
      blockPath: blockPath,
      history: [
        ...history.data,
        {
          timestamp: Date.now(),
          prompt: promptToRecord,
          response: codeToRecord,
        },
      ],
    });
  };

  const handleSubmit = async (e) => {
    setIsLoading(true);
    e.preventDefault();
    const newPrompt = chatTextarea.current.value.trim();

    const toSend = {
      userMessage: newPrompt,
      agentName: agentName,
      conversationHistory: history.data,
      apiKey: openAIApiKey,
    };

    const response = await callAgent.mutateAsync(toSend);
    console.log(response);
    recordCode(newPrompt, response);
    chatTextarea.current.value = "";

    setIsLoading(false);
  };

  return (
    <>
      <div className="flex w-full min-w-0 flex-col">
        <span className="text-md text-gray-30 mt-2">
          {currentFile.relativePath ? (
            <span>{currentFile.relativePath}</span>
          ) : null}
        </span>
        {fileSystem === null ? (
          <div>Loading...</div>
        ) : (
          currentFile?.relativePath && (
            <div className="relative mt-6 overflow-y-auto px-5">
              {EDIT_ONLY_FILES.some((fileName) =>
                currentFile.relativePath.endsWith(fileName),
              ) ? (
                <ViewerCodeMirror code={fileContent.data || ""} />
              ) : (
                <>
                  <EditorCodeMirror
                    code={fileContent.data || ""}
                    onChange={(newValue) => onChange(newValue)}
                  />
                  <div className="absolute right-8 top-2">
                    <Button
                      renderIcon={Save}
                      iconDescription="Save code"
                      tooltipPosition="left"
                      hasIconOnly
                      size="md"
                      onClick={(e) => saveChanges(e)}
                    />
                  </div>
                </>
              )}
            </div>
          )
        )}
      </div>
      {isComputation && openAIApiKey && (
        <div className="relative">
          <div className="text-right">
            <div className="inline-block p-2">
              <Bot size={24} className="align-middle" />
              <span className="text-md align-middle">{agentName}</span>
            </div>
            <textarea
              className="block-editor-prompt-input w-full resize-none p-2"
              ref={chatTextarea}
              placeholder="Ask to generate code or modify last code"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
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
              <IconButton
                iconDescription="Send Prompt"
                label="Send Prompt"
                kind="ghost"
                onClick={handleSubmit}
              >
                <SendFilled size={24} />
              </IconButton>
            )}
          </div>
        </div>
      )}
      <Modal
        open={isModalOpen}
        modalHeading="Unsaved Changes"
        primaryButtonText="Save Changes"
        secondaryButtonText="Cancel"
        onRequestSubmit={handleModalConfirm}
        onRequestClose={handleModalCancel}
        size="xs"
      >
        <p>You have unsaved changes. Do you want to save them?</p>
      </Modal>
    </>
  );
}
