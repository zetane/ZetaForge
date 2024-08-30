import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import FileExplorer from "./FileExplorer";
import FileViewer from "./FileViewer";
import PromptList from "./PromptList";
import "allotment/dist/style.css";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import PersistentAllotment from "../../PersistentAllotment";
import { Allotment } from "allotment";
import useFileBuffer from "@/hooks/useFileBuffer";
import { FileBufferContext } from "./FileBufferContext";
import { ChatHistoryContext } from "./ChatHistoryContext";
import useChatHistory from "@/hooks/useChatHistory";
import { SelectedPromptContext } from "./SelectedPromptContext";
import { FileHandleContext } from "./FileHandleContext";
import useFileHandle from "@/hooks/useFileHandle";
import AgentPrompt from "./AgentPrompt";
import { openAIApiKeyAtom } from "@/atoms/apiKeysAtom";

export default function DirectoryViewer({ blockId }) {
  const pipeline = useAtomValue(pipelineAtom);
  const openAIApiKey = useAtomValue(openAIApiKeyAtom);
  const fileHandle = useFileHandle();
  const chatHistory = useChatHistory(pipeline.id, blockId);
  const [selectedPrompt, setSelectedPrompt] = useState();
  //TODO fix TRPC errors when undefined
  const fileBuffer = useFileBuffer(
    pipeline.id,
    blockId,
    fileHandle
  );

  const displayAgentPrompt = fileHandle.isComputation && openAIApiKey;

  // TODO ugly find another way
  useEffect(() => {
    fileBuffer.load();
  }, [fileHandle.currentFile]);

  return (
    <FileBufferContext.Provider value={fileBuffer}>
      <ChatHistoryContext.Provider value={chatHistory}>
        <SelectedPromptContext.Provider
          value={{ selectedPrompt, setSelectedPrompt }} //TODO rename
        >
          <FileHandleContext.Provider value={fileHandle}>
              <div className="flex flex-col h-full">
              <PersistentAllotment
                storageKey={"DirectoryViewerMain"}
                initialSize={[20, 80]}
              >
                <div className="left-panel h-full mx-1.5">
                  <PersistentAllotment
                    storageKey={"DirectoryViewerLeft"}
                    initialSize={[50, 50]}
                    vertical
                  >
                    <FileExplorer pipelineId={pipeline.id} blockId={blockId} />
                    <Allotment.Pane visible={fileHandle.isComputation}>
                      <PromptList />
                    </Allotment.Pane>
                  </PersistentAllotment>
                </div>
                <FileViewer />
              </PersistentAllotment>
              {displayAgentPrompt && <AgentPrompt />}
              </div>
          </FileHandleContext.Provider>
        </SelectedPromptContext.Provider>
      </ChatHistoryContext.Provider>
    </FileBufferContext.Provider>
  );
}

