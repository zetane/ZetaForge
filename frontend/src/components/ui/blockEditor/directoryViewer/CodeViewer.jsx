import { useState, useEffect } from "react";
import { trpc } from "@/utils/trpc";
import { ViewerCodeMirror } from "./CodeMirrorComponents";

export default function CodeViewer({ pipelineId, blockId, currentFile }) {
  const getFileContent = trpc.block.file.byPath.get.useMutation();
  const [fileContentBuffer, setFileContentBuffer] = useState();

  useEffect(() => {
    const fetchFileContent = async () => {
      const content = await getFileContent.mutateAsync({
        pipelineId: pipelineId,
        blockId: blockId,
        path: currentFile.relativePath,
      });
      setFileContentBuffer(content);
    };

    fetchFileContent();
  }, []);
  return <ViewerCodeMirror code={fileContentBuffer ?? ""} />
}
