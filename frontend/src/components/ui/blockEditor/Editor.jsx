import { openAIApiKeyAtom } from '@/atoms/apiKeysAtom';
import { compilationErrorToastAtom } from '@/atoms/compilationErrorToast';
import { drawflowEditorAtom } from '@/atoms/drawflowAtom';
import { blockEditorRootAtom, isBlockEditorOpenAtom } from "@/atoms/editorAtom";
import { pipelineAtom } from '@/atoms/pipelineAtom';
import { updateSpecs } from '@/utils/specs';
import { trpc } from '@/utils/trpc';
import {
  Bot,
  Close,
  Edit,
  Maximize,
  Minimize,
  OperationsRecord,
  Run,
  Save,
  Send
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
import { useImmerAtom } from 'jotai-immer';
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { EditorCodeMirror, ViewerCodeMirror } from "./CodeMirrorComponents";
import DirectoryViewer from "./DirectoryViewer";
import TestLogs from "./TestLogs";

export default function Editor() {
  const serverAddress = "http://localhost:3330";
  const minizedStyles = "inset-y-16 right-8 w-1/3"
  const maximizedStyles = "inset-y-11 right-0 w-full"
  const [blockPath] = useAtom(blockEditorRootAtom);
  const [blockFolderName, setBlockFolderName] = useState(null); //TODO check if still needed
  const setBlockEditorOpen = useSetAtom(isBlockEditorOpenAtom);
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
  const [activeCodeMirror, setActiveCodeMirror] = useState(null);
  const [isMaximized, setMaximized] = useState(false)
  const chatTextarea = useRef(null);
  const panel = useRef(null);

  const compileComputation = trpc.compileComputation.useMutation();
  const saveBlockSpecs = trpc.saveBlockSpecs.useMutation();
  const runTest = trpc.runTest.useMutation();

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


    init();
    fetchCodeTemplate();
  }, [blockPath]);

  useEffect(() => {
    // Hack. CodeMirror loads code asynchronously and doesn't assume its full size until it is done loading.
    // There isn't a simple way to run code when CodeMirror is done loading. 
    // We add a delay so that the scrolling happens when CodeMirror is at its full size. 
    setTimeout(() => {
      panel.current.scrollTo({ lef: 0, top: panel.current.scrollHeight, behavior: "smooth" })
    }, 100)
  }, [queryAndResponses, showEditor])

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

    fetchFileSystem(blockFolderName);
  };

  const handleDockerCommands = useCallback(async () => {
    setIsRunButtonPressed(true);
    await runTest.mutateAsync();
    fetchFileSystem(blockFolderName);
  }, [blockFolderName, blockPath, fetchFileSystem]);

  const handleSequentialExecution = async (e, index) => {
    await handleGenerate(e, index);
    await handleDockerCommands();
  };

  const handleClose = () => {
    setBlockEditorOpen(false);
  };

  const toggleMaximize = () => {
    setMaximized((prev) => !prev)
  }

  return (
    <div ref={panel} className={"editor-block absolute overflow-y-scroll z-[8000] " + (isMaximized ? maximizedStyles : minizedStyles)}>
      <div className="block-editor-header">
        <span className="p-4 text-lg italic">{blockFolderName}</span>
        <div className="flex flex-row items-center justify-end">
          <div className="p-4">
            <Bot size={24} className="mx-2 align-middle" />
            <span className="text-lg">{agentName}</span>
          </div>
          <IconButton kind="ghost" size="lg" className="my-px-16" onClick={toggleMaximize} label="Maximize">
            {isMaximized ? <Minimize size={24} /> : <Maximize size={24} />}
          </IconButton>
          <IconButton kind="ghost" size="lg" onClick={handleClose} label="Close">
            <Close size={24} />
          </IconButton>
        </div>
      </div>
      <Tabs>
        <div></div>
        <TabList fullWidth className='shrink-0 max-w-[40rem] mx-auto'>
          <Tab onClick={handleTabClick}>
            Workspace
          </Tab>
          <Tab onClick={handleTabClick}>
            Files
          </Tab>
          <Tab onClick={handleTabClick}>
            Logs
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel className="overflow-y-scroll">
            <div className="flex flex-col gap-y-8">
              {queryAndResponses.map((item, index) => (
                <Fragment key={index}>
                  <span className="block-editor-prompt">
                    {item.prompt}
                  </span>
                  <div>
                    <div className='block-editor-code-header'>Code #{index}</div>
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
                  <div className='block-editor-code-header'>{editorManualPrompt}</div>
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
                        className="block-editor-prompt-input"
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
          <TabPanel className="overflow-hidden">
            <DirectoryViewer
              fileSystemProp={fileSystem}
              blockPath={blockPath}
              lastGeneratedIndex={lastGeneratedIndex}
              handleDockerCommands={handleDockerCommands}
              fetchFileSystem={fetchFileSystem}
              blockFolderName={blockFolderName}
            />
          </TabPanel>
          <TabPanel className="overflow-hidden">
            <TestLogs
              filePath={blockLogs}
              startFetching={isRunButtonPressed}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
