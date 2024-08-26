import { useContext } from "react";
import PromptViewer from "./PromptViewer";
import CodeManualEditor from "./CodeManualEditor";
import { SelectedPromptContext } from "./SelectedPromptContext";

export default function CodeEditor() {
  const selectedPrompt = useContext(SelectedPromptContext);


  return (
    <div className="flex h-full flex-col gap-8">
      {selectedPrompt.selectedPrompt ? <PromptViewer /> : <CodeManualEditor />}
    </div>
  );
}
