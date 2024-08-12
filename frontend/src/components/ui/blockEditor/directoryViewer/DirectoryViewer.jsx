import { useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import FileExplorer from "./FileExplorer";
import FileViewer from "./FileViewer";
import PromptList from "./PromptList";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { splitPanelSizeAtom } from "@/atoms/editorAtom";

export default function DirectoryViewer({ blockId }) {
  const pipeline = useAtomValue(pipelineAtom);
  const [currentFile, setCurrentFile] = useState();
  const [promptResponse, setPromptResponse] = useState();
  const [splitPanelSize, setSplitPanelSize] = useAtom(splitPanelSizeAtom);

  const isComputation = currentFile?.name === "computations.py" ?? false;

  const handleSelectFile = (selectedFile) => {
    setCurrentFile(selectedFile);
    setPromptResponse(undefined);
  };

  const handleSelectPrompt = (response) => {
    setPromptResponse(response);
  };

  const handleAcceptPrompt = () => {
    setPromptResponse(undefined);
  };

  const handleSplitPanelSizeChange = (key, size) => {
    console.log(key);
    setSplitPanelSize((previous) => ({
      ...previous,
      [key]: size,
    }));
  };

  console.log(splitPanelSize.file, splitPanelSize.directory);

  return (
    <Allotment
      defaultSizes={splitPanelSize.file}
      onChange={(size) => handleSplitPanelSizeChange("file", size)}//TODO find a way to avoid passing a string
    >
      <div className="h-full">
        <Allotment
          defaultSizes={splitPanelSize.directory}
          onChange={(size) => handleSplitPanelSizeChange("directory", size)}//TODO find a way to avoid passing a string
          vertical
        >
          <FileExplorer
            pipelineId={pipeline.id}
            blockId={blockId}
            // currentFile={currentFile}
            onSelectFile={handleSelectFile}
          />
          {isComputation && (
            <PromptList
              pipelineId={pipeline.id}
              blockId={blockId}
              onSelectPrompt={handleSelectPrompt}
            />
          )}
        </Allotment>
      </div>
      <FileViewer
        pipelineId={pipeline.id}
        blockId={blockId}
        currentFile={currentFile}
        promptResponse={promptResponse}
        onAcceptPrompt={handleAcceptPrompt}
      />
      )
    </Allotment>
  );
}
