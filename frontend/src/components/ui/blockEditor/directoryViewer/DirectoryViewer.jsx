import { pipelineAtom } from "@/atoms/pipelineAtom";
import { useAtom } from "jotai";
import { useState } from "react";
import FileExplorer from "./FileExplorer";
import FileViewer from "./FileViewer";
import PromptList from "./PromptList";
import { Allotment } from "allotment";
import "allotment/dist/style.css";

export default function DirectoryViewer({ blockId }) {
  const [currentFile, setCurrentFile] = useState({ isSelected: false });
  const [pipeline] = useAtom(pipelineAtom);

  return (
    <Allotment>
      <div className="h-full">
        <Allotment vertical>
            <FileExplorer
              pipelineId={pipeline.id}
              blockId={blockId}
              currentFile={currentFile}
              setCurrentFile={setCurrentFile}
            />
            <PromptList />
        </Allotment>
      </div>
      {currentFile.isSelected && (
        <FileViewer
          key={currentFile.relativePath}
          pipelineId={pipeline.id}
          blockId={blockId}
          currentFile={currentFile}
        />
      )}
    </Allotment>
  );
}
