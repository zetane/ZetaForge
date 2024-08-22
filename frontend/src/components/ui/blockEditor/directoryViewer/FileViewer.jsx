import {
  BLOCK_SPECS_FILE_NAME,
  CHAT_HISTORY_FILE_NAME,
} from "@/utils/constants";
import CodeViewer from "./CodeViewer";
import CodeEditor from "./CodeEditor";

const READ_ONLY_FILES = [BLOCK_SPECS_FILE_NAME, CHAT_HISTORY_FILE_NAME];
export default function FileViewer({
  pipelineId,
  blockId,
  currentFile,
  prompt,
  onAddPrompt,
}) {
  const getViewer = () => {
    if (currentFile) {
      const isReadOnly = READ_ONLY_FILES.some((fileName) =>
        currentFile.name.endsWith(fileName),
      );
      if (isReadOnly) {
        return (
          <CodeViewer
            key={currentFile.relativePath}
            pipelineId={pipelineId}
            blockId={blockId}
            currentFile={currentFile}
          />
        );
      } else {
        return (
          <CodeEditor
            key={currentFile.relativePath}
            pipelineId={pipelineId}
            blockId={blockId}
            currentFile={currentFile}
            prompt={prompt}
            onAddPrompt={onAddPrompt}
          />
        );
      }
    } else {
      return <></>;
    }
  };

  return getViewer();
}
