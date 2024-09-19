import FileImportButton from "./FileImportButton";
import FolderImportButtons from "./FolderImportButon";

export default function ImportButtons({ pipelineId, blockId }) {
  return (
    <div className="m-1.5 flex flex-row justify-start gap-4">
      <FileImportButton pipelineId={pipelineId} blockId={blockId} />
      <FolderImportButtons pipelineId={pipelineId} blockId={blockId} />
    </div>
  );
}
