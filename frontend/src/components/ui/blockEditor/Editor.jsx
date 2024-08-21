import { isBlockEditorOpenAtom } from "@/atoms/editorAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { Close, Maximize, Minimize } from "@carbon/icons-react";
import {
  IconButton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@carbon/react";
import { useAtom, useSetAtom } from "jotai";
import DirectoryViewer from "./directoryViewer/DirectoryViewer";
import SpecsInterface from "./SpecsInterface";
import TestLogs from "./TestLogs";

export default function Editor({ blockId, isMaximized, onToggleMaximize }) {
  const [pipeline] = useAtom(pipelineAtom);
  const blockName = pipeline.data[blockId].information.name;
  const setBlockEditorOpen = useSetAtom(isBlockEditorOpenAtom);

  const sizeStyle =  isMaximized ? "maximized" : "minimized";

  const handleClose = () => {
    setBlockEditorOpen(false);
  };

  const toggleMaximize = () => {
    onToggleMaximize();
  };

  return (
    <div
      className={
        `editor-block absolute z-[8000] flex flex-col ${sizeStyle}`
      }
    >
      <div className="block-editor-header">
        <div className="py-2 pl-4">
          <p className="text-base italic">{blockName}</p>
          <p className="text-xs">{blockId}</p>
        </div>
        <div className="flex flex-row items-center justify-end">
          <IconButton
            kind="ghost"
            onClick={toggleMaximize}
            label={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? <Minimize/> : <Maximize/>}
          </IconButton>
          <IconButton
            kind="ghost"
            onClick={handleClose}
            label="Close"
          >
            <Close/>
          </IconButton>
        </div>
      </div>
      <Tabs>
        <TabList
          fullWidth
          className="mx-auto max-w-[40rem] shrink-0"
          aria-label="Editor tabs mb-1"
        >
          <Tab>Files</Tab>
          <Tab>Specs</Tab>
          <Tab>Test Block</Tab>
        </TabList>
        <TabPanels>
          <TabPanel className="overflow-hidden h-full p-0">
            <DirectoryViewer key={blockId} blockId={blockId} />
          </TabPanel>
          <TabPanel className="overflow-y-auto">
            <SpecsInterface
              key={blockId}
              blockId={blockId}
            />
          </TabPanel>
          <TabPanel className="overflow-hidden">
            <TestLogs
              pipelineId={pipeline.id}
              blockId={blockId}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
