import { TreeView } from "@carbon/react";
import DirentNode from "./DirentNode";
import { trpc } from "@/utils/trpc";
import ImportButtons from "./ImportButtons";

export default function FileExplorer({
  pipelineId,
  blockId,
  currentFile,
  setCurrentFile,
}) {
  const root = trpc.block.file.get.useQuery({
    pipelineId: pipelineId,
    blockId: blockId,
  });

  return (
    <div className="flex flex-col">
      <div className="flex gap-x-1">
        <ImportButtons
          pipelineId={pipelineId}
          blockId={blockId}
        />
      </div>
      <div className="mt-1 w-80 overflow-y-auto">
        {root.data && (
          <TreeView
            label="directory view"
            selected={currentFile.relativePath}
            hideLabel
          >
            <DirentNode
              parent={root.data}
              setCurrentFile={setCurrentFile}
            />
          </TreeView>
        )}
      </div>
    </div>
  );
}
