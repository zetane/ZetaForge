import { blockEditorRootAtom, isBlockEditorOpenAtom } from "@/atoms/editorAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { trpc } from '@/utils/trpc';
import {
  Close,
  Maximize,
  Minimize,
  PlayFilled
} from "@carbon/icons-react";
import {
  Button,
  IconButton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs
} from "@carbon/react";
import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import DirectoryViewer from "./DirectoryViewer";
import SpecsInterface from "./SpecsInterface";
import TestLogs from "./TestLogs";

export default function Editor() {
  const serverAddress = "http://localhost:3330";
  const minizedStyles = "inset-y-16 right-0 w-1/2"
  const maximizedStyles = "inset-y-11 right-0 w-full"
  const [pipeline] = useAtom(pipelineAtom);
  const [blockPath] = useAtom(blockEditorRootAtom);
  const relPath = blockPath.replaceAll('\\', '/')
  const blockFolderName = relPath.split("/").pop();
  const blockName = pipeline.data[blockFolderName].information.name;
  const blockLogs = `${blockPath}/logs.txt`
  const setBlockEditorOpen = useSetAtom(isBlockEditorOpenAtom);

  const [queryAndResponses, setQueryAndResponses] = useState([]);
  const [lastGeneratedIndex, setLastGeneratedIndex] = useState("");
  const [fileSystem, setFileSystem] = useState({});
  const [isRunButtonPressed, setIsRunButtonPressed] = useState(false);
  const [isMaximized, setMaximized] = useState(false)
  const chatTextarea = useRef(null);
  const panel = useRef(null);

  const compileComputation = trpc.compileComputation.useMutation();
  const saveBlockSpecs = trpc.saveBlockSpecs.useMutation();
  const runTest = trpc.runTest.useMutation();

  useEffect(() => {
    fetchFileSystem(blockFolderName);
  }, [blockPath]);

  const handleTabClick = (e) => {
    e.currentTarget.blur();
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
  }, [blockPath]);

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
