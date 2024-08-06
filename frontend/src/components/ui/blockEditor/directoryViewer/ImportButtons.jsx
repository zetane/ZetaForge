import FileImportButton from "./FileImportButton";
import FolderImportButtons from "./FolderImportButon";

export default function ImportButtons({ pipelineId, blockId }) {
  return (
    <>
      <FileImportButton pipelineId={pipelineId} blockId={blockId} />
      <FolderImportButtons pipelineId={pipelineId} blockId={blockId} />
    </>
  );
}
