import FileImportButton from "./FileImportButton";
import FolderImportButtons from "./FolderImportButon";

export default function ImportButtons({ pipelinePath, blockId }) {
  return (
    <div className="m-1.5 flex flex-row justify-start gap-4">
      <FileImportButton pipelinePath={pipelinePath} blockId={blockId} />
      <FolderImportButtons pipelinePath={pipelinePath} blockId={blockId} />
    </div>
  );
}
