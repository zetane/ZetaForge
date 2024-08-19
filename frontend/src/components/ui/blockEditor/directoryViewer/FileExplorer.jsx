import { TreeView } from "@carbon/react";
import DirectoryEntryNode from "./DirectoryEntryNode";
import { trpc } from "@/utils/trpc";
import ImportButtons from "./ImportButtons";

export default function FileExplorer({ pipelineId, blockId, onSelectFile }) {
  const root = trpc.block.file.get.useQuery({
    pipelineId: pipelineId,
    blockId: blockId,
  });

  return (
    <div className="flex h-full flex-col">
      <ImportButtons pipelineId={pipelineId} blockId={blockId} />
      <div className="mt-1 flex-1 overflow-y-auto">
        {root.data && (
          <TreeView label="directory view" hideLabel>
            <DirectoryEntryNode tree={root.data} isRoot={true} onSelectFile={onSelectFile} />
          </TreeView>
        )}
      </div>
    </div>
  );
}