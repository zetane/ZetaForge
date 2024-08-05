import { pipelineAtom } from "@/atoms/pipelineAtom";
import { useAtom } from "jotai";
import { useState } from "react";
import Splitter from "./Splitter";
import FileExplorer from "./FileExplorer";
import CodeEditor from "./CodeEditor";
import PromptList from "./PromptList";

export default function DirectoryViewer({ blockId }) {
  const [currentFile, setCurrentFile] = useState({ isSelected: false });
  const [pipeline] = useAtom(pipelineAtom);

  return (
    <div className="flex h-full">
      <FileExplorer
        pipelineId={pipeline.id}
        blockId={blockId}
        currentFile={currentFile}
        setCurrentFile={setCurrentFile}
      />
      <PromptList />
      <Splitter />
      {currentFile.isSelected && (
        <CodeEditor
          key={currentFile.relativePath}
          pipelineId={pipeline.id}
          blockId={blockId}
          currentFile={currentFile}
        />
      )}
    </div>
  );
}
