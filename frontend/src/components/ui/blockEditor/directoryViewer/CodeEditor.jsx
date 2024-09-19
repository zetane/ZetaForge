import { useContext } from "react";
import PromptViewer from "./PromptViewer";
import CodeManualEditor from "./CodeManualEditor";
import { SelectedPromptContext } from "./DirectoryViewer";

export default function CodeEditor() {
  const selectedPrompt = useContext(SelectedPromptContext);

  return (
    <div className="flex h-full flex-col gap-8">
      {selectedPrompt.selected ? <PromptViewer /> : <CodeManualEditor />}
    </div>
  );
}
