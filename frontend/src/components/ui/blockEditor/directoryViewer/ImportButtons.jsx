import FileImportButton from "./FileImportButton";
import FolderImportButtons from "./FolderImportButon";

export default function ImportButtons({ pipelineId, blockId }) {
  return (
    <div className="flex flex-row gap-1 justify-end">
      <FileImportButton pipelineId={pipelineId} blockId={blockId} />
      <FolderImportButtons pipelineId={pipelineId} blockId={blockId} />
    </div>
  );
}
