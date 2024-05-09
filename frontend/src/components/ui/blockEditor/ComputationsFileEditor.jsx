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
  const [blockFolderName, setBlockFolderName] = useState(null); //TODO check if still needed
  const [openAIApiKey] = useAtom(openAIApiKeyAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [editor] = useAtom(drawflowEditorAtom);
  const [compilationErrorToast, setCompilationErrorToast] = useAtom(compilationErrorToastAtom)

  // const [agentName, setAgentName] = useState('gpt-4_python_compute');
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

    // const fetchChatHistoryIndex = async () => {
    //   try {
    //     const response = await fetch(`${serverAddress}/get-chat-history-index?blockPath=${encodeURIComponent(blockPath)}`);
    //     if (!response.ok) {
    //       throw new Error('Failed to fetch chat history index');
    //     }
    //     const data = await response.json();
    //     setActiveCodeMirror(data.chatHistoryIndex);
    //   } catch (error) {
    //     console.error("Error fetching chat history index:", error);
    //   }
    // };
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
          // Handle the case where no index is found, maybe initialize to the first position
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

//   useEffect(() => {
//     // Hack. CodeMirror loads code asynchronously and doesn't assume its full size until it is done loading.
//     // There isn't a simple way to run code when CodeMirror is done loading. 
//     // We add a delay so that the scrolling happens when CodeMirror is at its full size. 
//     setTimeout(() => {
//       panel.current.scrollTo({ lef: 0, top: panel.current.scrollHeight, behavior: "smooth" })
//     }, 100)
//   }, [queryAndResponses, showEditor])

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
        // Scroll to the bottom of the component
        if (panel.current) {
            setTimeout(() => {
                panel.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
        }
    // e.currentTarget.blur();
  };

  const handleEdit = (e) => {
    // Extract the index from the button's ID
    const buttonId = e.currentTarget.id;
    const index = parseInt(buttonId.split("-").pop(), 10);

    if (index >= 0 && index < queryAndResponses.length) {
      setEditorValue(queryAndResponses[index].response);
      setEditorManualPrompt("Manual edit of code #" + index);
      setShowEditor(true); // Show the EditorCodeMirror
    }
    e.currentTarget.blur();

    // Scroll to the bottom of the component
    if (panel.current) {
        setTimeout(() => {
            panel.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
        }
  };



  // const fetchFileSystem = useCallback(async () => {
  //   try {
  //     const response = await fetch(`${serverAddress}/get-directory-tree`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({ folder: blockPath }),
  //     });
  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }

  //     const data = await response.json();
  //     const inserted_data = {
  //       [blockFolderName]: { content: data, expanded: true, type: "folder" },
  //     };
  //     setFileSystem(inserted_data);
  //   } catch (error) {
  //     console.error("Error fetching file system:", error);
  //   }
  // }, [blockFolderName, blockPath]);


  // const handleGenerate = async (e, index) => {
  //   e.currentTarget.blur();

  //   setLastGeneratedIndex(index);
  //   let code_content = editorValue;

  //   const requestBody = JSON.stringify({
  //     block_user_name: blockFolderName,
  //     block_name: blockFolderName,
  //     agent_name: agentName,
  //     blockPath: blockPath,
  //     computations_script: code_content,
  //   });

  //   try {
  //     const response = await fetch(`${serverAddress}/new-block-react`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: requestBody,
  //     });

  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }
  //   } catch (error) {
  //     console.error("Request failed: " + error.message);
  //   }

  //   try {
  //     const newSpecsIO = await compileComputation.mutateAsync({ blockPath: blockPath });
  //     const newSpecs = await updateSpecs(blockFolderName, newSpecsIO, pipeline.data, editor);
  //     setPipeline((draft) => {
  //       draft.data[blockFolderName] = newSpecs;
  //     })
  //     await saveBlockSpecs.mutateAsync({ blockPath: blockPath, blockSpecs: newSpecs });
  //   } catch (error) {
  //     console.error(error)
  //     setCompilationErrorToast(true);
  //   }

  //   setActiveCodeMirror(index);

  //   fetchFileSystem(blockFolderName);
  // };
  // const handleGenerate = async (e, index) => {
    const handleGenerate = async (index) => {
    // e.currentTarget.blur();

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
    
    // fetchFileSystem(blockFolderName);
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

    // fetchFileSystem(blockFolderName);
    fetchFileSystem();
  }, [blockFolderName, blockPath, fetchFileSystem]);

  const handleSequentialExecution = async (e, index) => {
    await handleGenerate(e, index);
    await handleDockerCommands();
  };

//   const handleSaveCompile = async (event) => {
//     event.preventDefault(); // Prevent the default form submission behavior
//     await handleSave();     // Assuming handleSave knows what to save
//     handleGenerate(event);  // Assuming handleGenerate does not need an index
//     onUpdateDirectoryViewer();
// };


  return (
    <div ref={panel} className="flex flex-col gap-y-12">
        {queryAndResponses.map((item, index) => (
        <Fragment key={index}>
            <span className="block-editor-prompt">
            {item.prompt}
            </span>
            <div>
            <div className="flex items-center mb-4"> {/* Flex container for horizontal alignment */}
              {/* <div className='bg-[var(--ztn-purple-0)] py-2 pl-2 rounded'> */}

                <RadioButton
                    id={`select-button-${index}`}
                    labelText=""  // Hide label text
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
                    // kind="ghost"
                    onClick={handleEdit}
                />
  
                {/* <Button
                    id={`generate-button-${index}`}
                    renderIcon={OperationsRecord}
                    iconDescription="Select Active Code"
                    hasIconOnly
                    size="md"
                    kind="ghost"
                    onClick={(e) => handleGenerate(e, index)}
                /> */}
                {/* <Button
                    id={`execute-button-${index}`}
                    renderIcon={Run}
                    iconDescription="Compile files and run block test"
                    hasIconOnly
                    size="md"
                    kind="ghost"
                    onClick={(e) => handleSequentialExecution(e, index)}
                /> */}
                </div>
            </div>
            </div>
        </Fragment>
        ))}
        {showEditor ? (
        // Render EditorCodeMirror if showEditor is true
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
                // kind="ghost"
                className="edit-button"
                onClick={handleSave}
                // onClick={handleSaveCompile}
                />
            </div>
            </div>
        </div>
        ) : (
        // Render input group if showEditor is false
        <>
            {openAIApiKey &&
            <div className="relative">
                {/* <div className="p-4">
                  <Bot size={24} className="mx-0 align-middle" />
                  <span className="text-md">{agentName}</span>
                </div>
                <textarea
                className="block-editor-prompt-input"
                ref={chatTextarea}
                placeholder="Ask to generate code or modify last code"
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                    }
                }}
                /> */}
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
                        // <IconButton iconDescription="Send" tooltipPosition="left" size="md" kind="ghost" onClick={handleSubmit}>
                        //     <Send size={24} />
                        // </IconButton>
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
