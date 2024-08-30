import { useAtomValue } from "jotai";
import FileExplorer from "./FileExplorer";
import FileViewer from "./FileViewer";
import PromptList from "./PromptList";
import "allotment/dist/style.css";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import PersistentAllotment from "../../PersistentAllotment";
import { Allotment } from "allotment";
import { FileBufferContext } from "./FileBufferContext";
import { ChatHistoryContext } from "./ChatHistoryContext";
import useChatHistory from "@/hooks/useChatHistory";
import { SelectedPromptContext } from "./SelectedPromptContext";
import { FileHandleContext } from "./FileHandleContext";
import useFileHandle from "@/hooks/useFileHandle";
import AgentPrompt from "./AgentPrompt";
import { openAIApiKeyAtom } from "@/atoms/apiKeysAtom";
import useSelectPrompt from "@/hooks/useSelecPrompt";

export default function DirectoryViewer({ blockId }) {
  const pipeline = useAtomValue(pipelineAtom);
  const openAIApiKey = useAtomValue(openAIApiKeyAtom);
  const fileHandle = useFileHandle(pipeline.id, blockId);
  const chatHistory = useChatHistory(pipeline.id, blockId);
  const selectedPrompt = useSelectPrompt();

  const displayAgentPrompt = fileHandle.isComputation && openAIApiKey;

  return (
    <FileHandleContext.Provider value={fileHandle}>
      <FileBufferContext.Provider value={fileHandle.buffer}>
        <ChatHistoryContext.Provider value={chatHistory}>
          <SelectedPromptContext.Provider value={selectedPrompt}>
            <div className="flex h-full flex-col">
              <PersistentAllotment
                storageKey={"DirectoryViewerMain"}
                initialSize={[20, 80]}
              >
                <div className="left-panel mx-1.5 h-full">
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
          </SelectedPromptContext.Provider>
        </ChatHistoryContext.Provider>
      </FileBufferContext.Provider>
    </FileHandleContext.Provider>
  );
}
