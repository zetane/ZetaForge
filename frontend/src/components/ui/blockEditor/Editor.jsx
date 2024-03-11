import { openAIApiKeyAtom } from '@/atoms/apiKeysAtom';
import { blockEditorRootAtom, isBlockEditorOpenAtom } from "@/atoms/editorAtom";
import {
  Bot,
  Close,
  Edit,
  Maximize,
  OperationsRecord,
  Run,
  Save,
  Send,
} from "@carbon/icons-react";
import {
  Button,
  IconButton,
  Loading,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@carbon/react";
import { useAtom, useSetAtom } from "jotai";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { EditorCodeMirror, ViewerCodeMirror } from "./CodeMirrorComponents";
import DirectoryViewer from "./DirectoryViewer";
import TestLogs from "./TestLogs";

export default function Editor() {
  const serverAddress = "http://localhost:3330";
  const [blockPath] = useAtom(blockEditorRootAtom);
  const [blockFolderName, setBlockFolderName] = useState(null); //TODO check if still needed
  const setBlockEditorOpen = useSetAtom(isBlockEditorOpenAtom);
  const [openAIApiKey] = useAtom(openAIApiKeyAtom);

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
  const [activeCodeMirror, setActiveCodeMirror] = useState(null);
  const chatTextarea = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const blockFolderName = blockPath.split("/").pop();
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


    init();
    fetchCodeTemplate();
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

  const resizeTextarea = (textarea) => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleTabClick = (e) => {
    e.currentTarget.blur(); // This will remove focus from the current tab
    fetchFileSystem(blockFolderName);
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
      setTimeout(() => {
const textarea = document.querySelector(".textarea-input");
        if (textarea) {
          resizeTextarea(textarea);
        }
        setTimeout(() => {
          window.scrollTo(0, document.body.scrollHeight);
        }, 100);
      }, 0);
    }
    setIsLoading(false);
  };

  const handleSave = (e) => {
    if (editorManualPrompt) {
      recordCode(editorManualPrompt, editorValue);
    }
    setShowEditor(false);
    e.currentTarget.blur();
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

    setTimeout(() => {
      const textarea = document.querySelector(".textarea-input");
      if (textarea) {
        resizeTextarea(textarea);
      }
      setTimeout(() => {
        window.scrollTo(0, document.body.scrollHeight);
      }, 100);
    }, 0);
    e.currentTarget.blur();
  };

  const fetchFileSystem = useCallback(async () => {
    try {
      const response = await fetch(`${serverAddress}/get-directory-tree`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folder: blockPath }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const inserted_data = {
        [blockFolderName]: { content: data, expanded: true, type: "folder" },
      };
      setFileSystem(inserted_data);
    } catch (error) {
      console.error("Error fetching file system:", error);
    }
  }, [blockFolderName, blockPath]);

  const handleGenerate = async (e, index) => {
    e.currentTarget.blur();

    setLastGeneratedIndex(index);
    let code_content = queryAndResponses[index].response;

    const requestBody = JSON.stringify({
      block_user_name: blockFolderName,
      block_name: blockFolderName,
      agent_name: agentName,
      blockPath: blockPath,
      computations_script: code_content,
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
    setActiveCodeMirror(index);

    fetchFileSystem(blockFolderName);
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

    fetchFileSystem(blockFolderName);
  }, [blockFolderName, blockPath, fetchFileSystem]);

  const handleSequentialExecution = async (e, index) => {
    await handleGenerate(e, index);
    await handleDockerCommands();
  };

  const handleClose = () => {
    setBlockEditorOpen(false);
  };

  return (
    <div className="editor-block absolute inset-y-16 right-8 max-h-full w-1/3 overflow-y-scroll bg-carbonGray-900">
      <div className="flex flex-row items-center justify-between">
        <span className="p-4 text-lg italic">{blockFolderName}</span>
        <div className="flex flex-row items-center justify-end">
          <div className="p-4">
            <Bot size={24} className="mx-2 align-middle" />
            <span className="text-lg">{agentName}</span>
          </div>
          <IconButton kind="ghost" size="lg" className="my-px-16">
            <Maximize size={24} />
          </IconButton>
          <IconButton kind="ghost" size="lg" onClick={handleClose}>
            <Close size={24} />
          </IconButton>
        </div>
      </div>
      <div className="m-4">
        <Tabs>
          <TabList className="tab-list">
            <Tab className="tab-button" onClick={handleTabClick}>
              Workspace
            </Tab>
            <Tab className="tab-button" onClick={handleTabClick}>
              Files
            </Tab>
            <Tab className="tab-button" onClick={handleTabClick}>
              Logs
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <div className="flex flex-col gap-y-8">
                {queryAndResponses.map((item, index) => (
                  <Fragment key={index}>
                    <span className="rounded bg-neutral-700 p-2">
                      {item.prompt}
                    </span>
                    <div>
                      Code #{index}
                      <div
                        className="relative"
                        style={{
                          border:
                            activeCodeMirror === index
                              ? "2px solid yellow"
                              : "none",
                        }}
                      >
                        <ViewerCodeMirror
                          className="bg-carbonGray-600"
                          code={item.response}
                        />
                        <div className="absolute right-0 top-0">
                          <Button
                            id={`edit-button-${index}`}
                            renderIcon={Edit}
                            iconDescription="Edit code"
                            hasIconOnly
                            size="md"
                            kind="ghost"
                            onClick={handleEdit}
                          />
                          <Button
                            id={`generate-button-${index}`}
                            renderIcon={OperationsRecord}
                            iconDescription="Compile block files"
                            hasIconOnly
                            size="md"
                            kind="ghost"
                            onClick={(e) => handleGenerate(e, index)}
                          />
                          <Button
                            id={`execute-button-${index}`}
                            renderIcon={Run}
                            iconDescription="Compile files and run block test"
                            hasIconOnly
                            size="md"
                            kind="ghost"
                            onClick={(e) => handleSequentialExecution(e, index)}
                          />
                        </div>
                      </div>
                    </div>
                  </Fragment>
                ))}
                {showEditor ? (
                  // Render EditorCodeMirror if showEditor is true
                  <div>
                    {editorManualPrompt}
                    <div className="relative">
                        <EditorCodeMirror
                          code={editorValue}
                          onChange={handleEditorChange}
                        />
                      <div className="absolute right-0 top-0">
                        <Button
                          renderIcon={Save}
                          iconDescription="Save code"
                          hasIconOnly
                          size="md"
                          kind="ghost"
                          className="edit-button"
                          onClick={handleSave}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Render input group if showEditor is false
                  <>
                    {openAIApiKey &&
                      <div className="relative">
                        <textarea
                          className="min-h-20 w-full rounded-lg border-purple-300 bg-black p-2 text-base text-white placeholder-purple-300"
                          ref={chatTextarea}
                          placeholder="Ask to generate code or modify last code"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmit(e);
                            }
                          }}
                        />
                        <div className="absolute bottom-2 right-1">
                          <IconButton
                            iconDescription="Send"
                            size="md"
                            kind="ghost"
                            onClick={handleSubmit}
                          >
                            <Send size={24}></Send>
                          </IconButton>
                        </div>
                      </div>
                    }
                    {isLoading && (
                      <Loading
                        active={true}
                        className="send-spinner"
                        description="Loading"
                        withOverlay={false}
                      />
                    )}
                  </>
                )}
              </div>
            </TabPanel>
            <TabPanel className="remove-focus">
              <DirectoryViewer
                fileSystemProp={fileSystem}
                blockPath={blockPath}
                lastGeneratedIndex={lastGeneratedIndex}
                handleDockerCommands={handleDockerCommands}
                fetchFileSystem={fetchFileSystem}
              />
            </TabPanel>
            <TabPanel className="remove-focus">
              <div className="content">
                <TestLogs
                  filePath={blockLogs}
                  startFetching={isRunButtonPressed}
                />
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}
