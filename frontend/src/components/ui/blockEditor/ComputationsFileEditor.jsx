import { openAIApiKeyAtom } from '@/atoms/apiKeysAtom';
import { compilationErrorToastAtom } from '@/atoms/compilationErrorToast';
import { drawflowEditorAtom } from '@/atoms/drawflowAtom';
import { blockEditorRootAtom, isBlockEditorOpenAtom } from "@/atoms/editorAtom";
import { pipelineAtom } from '@/atoms/pipelineAtom';
import { updateSpecs } from '@/utils/specs';
import { trpc } from '@/utils/trpc';
import {
  Edit,
  Bot,
  OperationsRecord,
  Run,
  Save,
  Send
} from "@carbon/icons-react";
import {
  Button,
  IconButton,
  Loading,
  RadioButton
} from "@carbon/react";
import { useAtom, useSetAtom } from "jotai";
import { useImmerAtom } from 'jotai-immer';
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { EditorCodeMirror, ViewerCodeMirror } from "./CodeMirrorComponents";


export default function ComputationsFileEditor({ fetchFileSystem }) {
  const serverAddress = "http://localhost:3330";
  const [blockPath] = useAtom(blockEditorRootAtom);
  const [blockFolderName, setBlockFolderName] = useState(null);  
  const [openAIApiKey] = useAtom(openAIApiKeyAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [editor] = useAtom(drawflowEditorAtom);
  const [compilationErrorToast, setCompilationErrorToast] = useAtom(compilationErrorToastAtom)

  const [agentName, setAgent] = useState("gpt-4_python_compute");

  const [queryAndResponses, setQueryAndResponses] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editorValue, setEditorValue] = useState("");
  const [editorManualPrompt, setEditorManualPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastGeneratedIndex, setLastGeneratedIndex] = useState("");
  const [blockLogs, setBlockLogs] = useState("");
  const [fileSystem, setFileSystem] = useState({});
  const [isRunButtonPressed, setIsRunButtonPressed] = useState(false);
  const [activeCodeMirror, setActiveCodeMirror] = useState(0);
  const chatTextarea = useRef(null);
  const panel = useRef(null);

  const compileComputation = trpc.compileComputation.useMutation();
  const saveBlockSpecs = trpc.saveBlockSpecs.useMutation();

  useEffect(() => {
    const init = async () => {
      try {
        console.log(blockPath)
        const relPath = blockPath.replaceAll('\\', '/')
        const blockFolderName = relPath.split("/").pop();
        setBlockFolderName(blockFolderName);
        setBlockLogs(`${blockPath}/logs.txt`);
        setFileSystem({
          [blockFolderName]: { content: "", type: "folder" },
        });
        const response = await fetch(`${serverAddress}/get-agent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            blockPath: blockPath,
          }),
        });
        if (response.ok) {
          const agent = await response.json();
          setAgent(agent);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    const fetchCodeTemplate = async () => {
      try {
        const response = await fetch(`${serverAddress}/get-chat-history`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ blockPath: blockPath }),
        });
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const history = await response.json();
        setQueryAndResponses(history);
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    const fetchChatHistoryIndex = async () => {
      try {
        const response = await fetch(`${serverAddress}/get-chat-history-index?blockPath=${encodeURIComponent(blockPath)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch chat history index');
        }
        const data = await response.json();
        if (data.chatHistoryIndex !== -1) {
          setActiveCodeMirror(data.chatHistoryIndex);
        } else {
          setActiveCodeMirror(0);
        }
      } catch (error) {
        console.error("Error fetching chat history index:", error);
      }
    };
    

    init();
    fetchCodeTemplate();
    fetchChatHistoryIndex();
  }, [blockPath]);


  const recordCode = (promptToRecord, codeToRecord) => {
    const newQueriesAndResponses = [
      ...queryAndResponses,
      {
        timestamp: Date.now(),
        prompt: promptToRecord,
        response: codeToRecord,
      }
    ];
    setQueryAndResponses(newQueriesAndResponses);
    fetch(`${serverAddress}/save-chat-history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blockPath: blockPath, history: newQueriesAndResponses }),
    });
  };

  const handleEditorChange = (value) => {
    setEditorValue(value);
  };

  const handleSubmit = async (e) => {
    setIsLoading(true);
    e.preventDefault();
    const newPrompt = chatTextarea.current.value.trim();

    const toSend = {
      userMessage: newPrompt,
      agentName: agentName,
      conversationHistory: queryAndResponses,
      apiKey: openAIApiKey
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

  const handleSave = (e) => {
    if (editorManualPrompt) {
      recordCode(editorManualPrompt, editorValue);
    }
    setShowEditor(false);
        if (panel.current) {
            setTimeout(() => {
                panel.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
        }
  };

  const handleEdit = (e) => {
    const buttonId = e.currentTarget.id;
    const index = parseInt(buttonId.split("-").pop(), 10);

    if (index >= 0 && index < queryAndResponses.length) {
      setEditorValue(queryAndResponses[index].response);
      setEditorManualPrompt("Manual edit of code #" + index);
      setShowEditor(true);
    }
    e.currentTarget.blur();

    if (panel.current) {
        setTimeout(() => {
            panel.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
        }
  };

  const handleGenerate = async (index) => {

    setLastGeneratedIndex(index);
    let code_content = queryAndResponses[index].response;

    const requestBody = JSON.stringify({
      block_user_name: blockFolderName,
      block_name: blockFolderName,
      agent_name: agentName,
      blockPath: blockPath,
      computations_script: code_content,
      chatHistoryIndex: index
    });

    try {
      const response = await fetch(`${serverAddress}/new-block-react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: requestBody,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Request failed: " + error.message);
    }

    try {
      const newSpecsIO = await compileComputation.mutateAsync({ blockPath: blockPath });
      const newSpecs = await updateSpecs(blockFolderName, newSpecsIO, pipeline.data, editor);
      setPipeline((draft) => {
        draft.data[blockFolderName] = newSpecs;
      })
      await saveBlockSpecs.mutateAsync({ blockPath: blockPath, blockSpecs: newSpecs });
    } catch (error) {
      console.error(error)
      setCompilationErrorToast(true);
    }

    setActiveCodeMirror(index);

    fetchFileSystem();
  };

  const handleDockerCommands = useCallback(async () => {
    setIsRunButtonPressed(true);
    try {
      const response = await fetch(`${serverAddress}/run-docker-commands`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ blockPath: blockPath }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Request failed: " + error.message);
    }

    fetchFileSystem();
  }, [blockFolderName, blockPath, fetchFileSystem]);

  const handleSequentialExecution = async (e, index) => {
    await handleGenerate(e, index);
    await handleDockerCommands();
  };


  return (
    <div ref={panel} className="flex flex-col gap-y-12">
        {queryAndResponses.map((item, index) => (
        <Fragment key={index}>
            <span className="block-editor-prompt">
            {item.prompt}
            </span>
            <div>
              <div className="flex items-center mb-4">
                <RadioButton
                  id={`select-button-${index}`}
                    name="activeCodeMirrorSelection"
                    value={index.toString()}
                    checked={activeCodeMirror === index}
                    onChange={() => handleGenerate(index)}
                />
                <div className='block-editor-code-header ml-2'>Select Code #{index}</div>
            </div>
            <div
                className="relative"
                style={{
                border:
                    activeCodeMirror === index
                    ? "2px solid darkorange"
                    : "none",
                }}
            >
                <ViewerCodeMirror
                className="code-block"
                code={item.response}
                />
                <div className="absolute right-4 top-4">
                <Button
                    id={`edit-button-${index}`}
                    renderIcon={Edit}
                    iconDescription="Edit Code"
                    tooltipPosition="top"
                    hasIconOnly
                    size="md"
                    onClick={handleEdit}
                  />
                </div>
            </div>
            </div>
        </Fragment>
        ))}
      {showEditor ? (
        <div>
            <div className='block-editor-code-header'>{editorManualPrompt}</div>
            <div className="relative">
            <EditorCodeMirror
                code={editorValue}
                onChange={handleEditorChange}
            />
            <div className="absolute right-4 top-4">
                <Button
                renderIcon={Save}
                iconDescription="Save code"
                tooltipPosition="left"
                hasIconOnly
                size="md"
                className="edit-button"
                onClick={handleSave}
                />
            </div>
            </div>
        </div>
      ) : (
        <>
            {openAIApiKey &&
              <div className="relative">
                <div className="text-right">
                    <div className="inline-block p-2">
                        <Bot size={24} className="align-middle" />
                        <span className="text-md align-middle">{agentName}</span>
                    </div>
                    <textarea
                        className="w-full p-2 block-editor-prompt-input resize-none"
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
                      <div className='prompt-spinner'>
                        <Loading active={true} className="send-spinner" description="Sending..." withOverlay={false}/>
                        </div>
                  ) : (
                        <button className="icon-button" onClick={handleSubmit} title="Submit">
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor"/>
                        </svg>
                    </button>
                    )}
                </div>


            </div>
            }
        </>
        )}
    </div>
  );
}
