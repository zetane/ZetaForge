import { TreeView } from "@carbon/react";
import DirectoryEntryNode from "./DirectoryEntryNode";
import { trpc } from "@/utils/trpc";
import ImportButtons from "./ImportButtons";

export default function FileExplorer({
  pipelineId,
  blockId,
  // currentFile,
  onSelectFile,
}) {
  const root = trpc.block.file.get.useQuery({
    pipelineId: pipelineId,
    blockId: blockId,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-x-1">
        <ImportButtons
          pipelineId={pipelineId}
          blockId={blockId}
        />
      </div>
      <div className="mt-1 flex-1 overflow-y-auto">
        {root.data && (// TODO loading state
          <TreeView
            label="directory view"
            // selected={currentFile.relativePath} // TODO check if this is needed at all
            hideLabel
          >
            <DirectoryEntryNode
              parent={root.data}
              onSelectFile={onSelectFile}
            />
          </TreeView>
        )}
      </div>
    </div>
  );
}
