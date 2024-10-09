import { useContext } from "react";
import PromptViewer from "./PromptViewer";
import CodeManualEditor from "./CodeManualEditor";
import { SelectedPromptContext, FileHandleContext } from "./DirectoryViewer";

export default function CodeEditor() {
  const selectedPrompt = useContext(SelectedPromptContext);
  const fileHandle = useContext(FileHandleContext);

  return (
    <div className="flex h-full flex-col gap-8">
      {selectedPrompt.selected ? <PromptViewer /> : <CodeManualEditor key={fileHandle.relativePath} />}
    </div>
  );
}
