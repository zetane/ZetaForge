import { useContext } from "react";
import { useAtomValue } from "jotai";
import { openAIApiKeyAtom } from "@/atoms/apiKeysAtom";
import AgentPrompt from "./AgentPrompt";
import PromptViewer from "./PromptViewer";
import CodeManualEditor from "./CodeManualEditor";
import { FileHandleContext } from "./FileHandleContext";
import { SelectedPromptContext } from "./SelectedPromptContext";

export default function CodeEditor() {
  const openAIApiKey = useAtomValue(openAIApiKeyAtom);
  const selectedPrompt = useContext(SelectedPromptContext);
  const fileHandle = useContext(FileHandleContext)

  const displayAgentPrompt = fileHandle.isComputation && openAIApiKey;

  return (
    <div className="flex h-full flex-col gap-8">
      {selectedPrompt.selectedPrompt ? <PromptViewer /> : <CodeManualEditor />}
      {displayAgentPrompt && <AgentPrompt />}
    </div>
  );
}
