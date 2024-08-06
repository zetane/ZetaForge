import { trpc } from "@/utils/trpc";
import { ViewerCodeMirror } from "./CodeMirrorComponents";

export default function CodeViewer({ pipelineId, blockId, currentFile }) {
  const fileContent = trpc.block.file.byPath.get.useQuery({
    pipelineId: pipelineId,
    blockId: blockId,
    path: currentFile.relativePath,
  });

  return <ViewerCodeMirror code={fileContent.data || ""} />;//TODO loading state
}
