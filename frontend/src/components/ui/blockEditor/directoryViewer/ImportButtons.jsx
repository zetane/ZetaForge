import FileImportButton from "./FileImportButton";
import FolderImportButtons from "./FolderImportButon";

export default function ImportButtons({ pipelineId, blockId }) {
  return (
    <div className="flex flex-row gap-4 justify-start m-1.5">
      <FileImportButton pipelineId={pipelineId} blockId={blockId} />
      <FolderImportButtons pipelineId={pipelineId} blockId={blockId} />
    </div>
  );
}
