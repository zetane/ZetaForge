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

const EDIT_ONLY_FILES = [BLOCK_SPECS_FILE_NAME, CHAT_HISTORY_FILE_NAME];
export default function CodeEditor({
  currentFile,
  setCurrentFile,
  setUnsavedChanges,
  fileSystem,
  setFileSystem,
  fetchFileSystem,
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
  const [agentName, ] = useState("gpt-4_python_compute");
  const chatTextarea = useRef(null);
  const history = trpc.chat.history.get.useQuery({ blockPath });
  const utils = trpc.useUtils();
  const updateHistory = trpc.chat.history.update.useMutation({
    onSuccess() {
      utils.chat.history.get.invalidate({ blockPath });
    },
  });

  console.log(currentFile);

  const saveChanges = (e) => {
    if (!currentFile || !currentFile.path) {
      console.error("No file selected");
      return;
    }

    const saveData = {
      pipelinePath: pipeline.buffer,
      filePath: currentFile.path,
      content: currentFile.content,
    };

    fetch(`${serverAddress}/save-file`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(saveData),
    })
      .then((response) => response.json())
      .then(async () => {
        setUnsavedChanges(false);
        if (isComputation(currentFile.path)) {
          try {
            const newSpecsIO = await compileComputation.mutateAsync({
              blockPath: blockPath,
            });
            const newSpecs = await updateSpecs(
              blockKey,
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
            fetchFileSystem();
          } catch (error) {
            console.error(error);
            setCompilationErrorToast(true);
          }
        }
      })
      .catch((error) => {
        console.error("Error saving file:", error);
      });
    e.currentTarget.blur();
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
    setUnsavedChanges(true);

    setCurrentFile((prevCurrentFile) => ({
      ...prevCurrentFile,
      content: newValue,
    }));

    setFileSystem((prevFileSystem) => {
      const relPath = currentFile.path.replaceAll("\\", "/");
      const pathSegments = relPath.split("/");
      let updatedFileSystem = { ...prevFileSystem };

      let currentLevel = updatedFileSystem;
      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];

        if (i === pathSegments.length - 1) {
          currentLevel[segment] = {
            ...currentLevel[segment],
            content: newValue,
          };
        } else {
          currentLevel = currentLevel[segment].content;
        }
      }

      return updatedFileSystem;
    });
  };

  const isComputation = (path) => {
    return path?.endsWith("computations.py");
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

    if (newPrompt) {
      try {
        const response = await fetch(`${serverAddress}/api/call-agent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(toSend),
        });

        const data = await response.json();

        if (response.ok) {
          const only_code_response = data.response;
          recordCode(newPrompt, only_code_response);
        } else {
          throw new Error(data.error || "Server error");
        }
      } catch (error) {
        console.error("Error fetching response:", error);
      }

      chatTextarea.current.value = "";
    }
    setIsLoading(false);
  };

  return (
    <>
      <div className="flex w-full min-w-0 flex-col">
        <span className="text-md text-gray-30 mt-2">
          {currentFile.path ? <span>{currentFile.path}</span> : null}
        </span>
        {fileSystem === null ? (
          <div>Loading...</div>
        ) : (
          currentFile &&
          currentFile.path && (
            <div className="relative mt-6 overflow-y-auto px-5">
              {EDIT_ONLY_FILES.some((fileName) =>
                currentFile.path.endsWith(fileName),
              ) ? (
                <ViewerCodeMirror code={currentFile.content || ""} />
              ) : (
                <>
                  <EditorCodeMirror
                    key={currentFile.path}
                    code={currentFile.content || ""}
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
      {(isComputation(currentFile?.path) && openAIApiKey) && (
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
