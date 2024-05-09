import { blockEditorRootAtom, isBlockEditorOpenAtom } from "@/atoms/editorAtom";
import {
  Bot,
  Close,
  Maximize,
  Minimize,
  PlayFilled
} from "@carbon/icons-react";
import {
  IconButton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Button
} from "@carbon/react";
import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import DirectoryViewer from "./DirectoryViewer";
import ComputationsFileEditor from './ComputationsFileEditor';
import TestLogs from "./TestLogs";
import SpecsInterface from "./SpecsInterface";
import { trpc } from '@/utils/trpc';

export default function Editor() {
  const serverAddress = "http://localhost:3330";
  const minizedStyles = "inset-y-16 right-0 w-1/2"
  const maximizedStyles = "inset-y-11 right-0 w-full"
  const [blockPath] = useAtom(blockEditorRootAtom);
  const [blockFolderName, setBlockFolderName] = useState(null);
  const [blockName, setBlockName] = useState("");
  const setBlockEditorOpen = useSetAtom(isBlockEditorOpenAtom);

  const [queryAndResponses, setQueryAndResponses] = useState([]);
  const [lastGeneratedIndex, setLastGeneratedIndex] = useState("");
  const [blockLogs, setBlockLogs] = useState("");
  const [fileSystem, setFileSystem] = useState({});
  const [isRunButtonPressed, setIsRunButtonPressed] = useState(false);
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
        const blockName = pipeline.data[blockFolderName].information.name;
        setBlockFolderName(blockFolderName);
        setBlockName(blockName);
        setBlockLogs(`${blockPath}/logs.txt`);
        setFileSystem({
          [blockFolderName]: { content: "", type: "folder" },
        });
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    init();
    fetchFileSystem(blockFolderName);
  }, [blockPath]);

  const handleTabClick = (e) => {
    e.currentTarget.blur(); // This removes focus from the current tab
    fetchFileSystem(blockFolderName);
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

  const handleDockerCommands = useCallback(async () => {
    setIsRunButtonPressed(true);
    runTest.mutateAsync({ blockPath: blockPath, blockKey: blockFolderName });
    await fetchFileSystem(blockFolderName);
  }, [blockFolderName, blockPath, fetchFileSystem]);

  const handleClose = () => {
    setBlockEditorOpen(false);
  };

  const toggleMaximize = () => {
    setMaximized((prev) => !prev)
  }

  return (
    <div className={"editor-block absolute flex flex-col z-[8000] " + (isMaximized ? maximizedStyles : minizedStyles)}>
      <div className="block-editor-header">
        <div className='p-4'>
          <p className='text-lg italic'>{blockName}</p>
          <p className="text-sm">{blockFolderName}</p>
        </div>
        <div className="flex flex-row items-center justify-end">
          <IconButton kind="ghost" size="lg" className="my-px-16" onClick={toggleMaximize} label="Maximize">
            {isMaximized ? <Minimize size={24} /> : <Maximize size={24} />}
          </IconButton>
          <IconButton kind="ghost" size="lg" onClick={handleClose} label="Close">
            <Close size={24} />
          </IconButton>
        </div>
      </div>
      <Tabs>
        <TabList fullWidth className='shrink-0 max-w-[40rem] mx-auto mb-1'>
        <Tab onClick={handleTabClick}>
            Files
          </Tab>
          <Tab onClick={handleTabClick}>
            Specs
          </Tab>
          <Tab onClick={handleTabClick}>
            Test Block
          </Tab>
        </TabList>
        <TabPanels>
        <TabPanel className="overflow-hidden">
            <DirectoryViewer
              fileSystemProp={fileSystem}
              blockPath={blockPath}
              lastGeneratedIndex={lastGeneratedIndex}
              fetchFileSystem={fetchFileSystem}
              blockFolderName={blockFolderName}
            />
          </TabPanel>
          <TabPanel className="overflow-y-scroll">
            <SpecsInterface blockPath={blockPath}/>
          </TabPanel>
          <TabPanel className="overflow-hidden">
          <Button
            renderIcon={PlayFilled}
            iconDescription="Run test"
            tooltipPosition="bottom"
            size="sm"
            onClick={handleDockerCommands}
            title="Run test from this block folder"
            style={{ marginBottom: '20px' }}
          >
            Run Test</Button>
            <div className="h-full pb-12">
            <TestLogs
              filePath={blockLogs}
              startFetching={isRunButtonPressed}
            />
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
