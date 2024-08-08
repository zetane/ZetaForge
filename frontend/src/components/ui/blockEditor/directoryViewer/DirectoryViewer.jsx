import { useState } from "react";
import { useAtomValue } from "jotai";
import FileExplorer from "./FileExplorer";
import FileViewer from "./FileViewer";
import PromptList from "./PromptList";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { pipelineAtom } from "@/atoms/pipelineAtom";

export default function DirectoryViewer({ blockId }) {
  const pipeline = useAtomValue(pipelineAtom)
  const [currentFile, setCurrentFile] = useState();
  const [promptResponse, setPromptResponse] = useState();

  // const isComputation = currentFile.name === "computations.py";

  const handleSelectFile = (selectedFile) => {
    setCurrentFile(selectedFile);
  }

  const handleSelectPrompt = (response) => {
    setPromptResponse(response)
  };

  const handleAcceptPromp = () => {
    setPromptResponse(undefined)
  }

  return (
    <Allotment>
      <div className="h-full">
        <Allotment vertical>
          <FileExplorer
            pipelineId={pipeline.id}
            blockId={blockId}
            currentFile={currentFile}
            onSelectFile={handleSelectFile}
          />
         {/* isComputation && <PromptList onSelectPrompt={handleSelectPrompt} /> */}
          <PromptList onSelectPrompt={handleSelectPrompt}/>
        </Allotment>
      </div>
      <FileViewer
        key={currentFile?.relativePath}
        pipelineId={pipeline.id}
        blockId={blockId}
        currentFile={currentFile}
        promptResponse={promptResponse}
        onAcceptPrompt={handleSelectPrompt}
      />
      )
    </Allotment>
  );
}
