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

  const sizeStyle = isMaximized ? "maximized" : "minimized";

  const handleClose = () => {
    setBlockEditorOpen(false);
  };

  const toggleMaximize = () => {
    onToggleMaximize();
  };

  return (
    <div
      className={`editor-block absolute z-[8000] flex flex-col ${sizeStyle}`}
      id="block-editor"
      data-floating-menu-container
    >
      <Tabs>
        <div className="block-editor-header">
          <div className="py-2 pl-4">
            <p className="text-base italic">{blockName}</p>
            <p className="text-xs">{blockId}</p>
          </div>
          <TabList
            fullWidth
            className="max-w-[40rem]"
            aria-label="Editor tabs mb-1"
          >
            <Tab>Files</Tab>
            <Tab>Specs</Tab>
            <Tab>Test Block</Tab>
          </TabList>
          <div className="flex flex-row items-center justify-end">
            <IconButton
              kind="ghost"
              onClick={toggleMaximize}
              label={isMaximized ? "Minimize" : "Maximize"}
            >
              {isMaximized ? <Minimize /> : <Maximize />}
            </IconButton>
            <IconButton kind="ghost" onClick={handleClose} label="Close">
              <Close />
            </IconButton>
          </div>
        </div>
        <TabPanels>
          <TabPanel className="h-full overflow-hidden p-0">
            <DirectoryViewer key={blockId} blockId={blockId} />
          </TabPanel>
          <TabPanel className="overflow-y-auto">
            <SpecsInterface key={blockId} blockId={blockId} />
          </TabPanel>
          <TabPanel className="overflow-hidden">
            <TestLogs pipelinePath={pipeline.path} blockId={blockId} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
