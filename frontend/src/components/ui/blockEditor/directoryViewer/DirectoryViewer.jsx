import { useState } from "react";
import { useAtomValue } from "jotai";
import FileExplorer from "./FileExplorer";
import FileViewer from "./FileViewer";
import PromptList from "./PromptList";
import "allotment/dist/style.css";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import PersistentAllotment from "../../PersistentAllotment";
import { Allotment } from "allotment";

export default function DirectoryViewer({ blockId }) {
  const pipeline = useAtomValue(pipelineAtom);
  const [currentFile, setCurrentFile] = useState();
  const [prompt, setPrompt] = useState();

  const isComputation = currentFile?.name === "computations.py";

  const handleSelectFile = (selectedFile) => {
    setCurrentFile(selectedFile);
    setPrompt(undefined);
  };

  const handleSelectPrompt = (response) => {
    setPrompt(response);
  };

  const handleSelectActivePrompt = () => {
    setPrompt(undefined);
  }

  const handleAddPrompt = () => {
    setPrompt(undefined);
  }

  return (
    <PersistentAllotment storageKey={"DirectoryViewerMain"} initialSize={[20, 80]}>
      <div className="h-full">
        <PersistentAllotment storageKey={"DirectoryViewerLeft"} initialSize={[50, 50]} vertical>
          <FileExplorer
            pipelineId={pipeline.id}
            blockId={blockId}
            onSelectFile={handleSelectFile}
          />
          <Allotment.Pane visible={isComputation}>
            <PromptList
              pipelineId={pipeline.id}
              blockId={blockId}
              onSelectPrompt={handleSelectPrompt}
              onSelectActive={handleSelectActivePrompt}
            />
          </Allotment.Pane>
        </PersistentAllotment>
      </div>
      <FileViewer
        pipelineId={pipeline.id}
        blockId={blockId}
        currentFile={currentFile}
        prompt={prompt}
        onAddPrompt={handleAddPrompt}
      />
    </PersistentAllotment>
  );
}
