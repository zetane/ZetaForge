import { TreeView } from "@carbon/react";
import DirectoryEntryNode from "./DirectoryEntryNode";
import { trpc } from "@/utils/trpc";
import ImportButtons from "./ImportButtons";

export default function FileExplorer({ pipelineId, blockId }) {
  const root = trpc.block.file.get.useQuery({
    pipelineId: pipelineId,
    blockId: blockId,
  });

  return (
    <div className="flex h-full flex-col m-1.5">
      <ImportButtons pipelineId={pipelineId} blockId={blockId} />
      <div className="mt-1 flex-1 overflow-y-auto">
        {root.data && (
          <TreeView label="directory view" hideLabel>
            <DirectoryEntryNode tree={root.data} isRoot={true}/>
          </TreeView>
        )}
      </div>
    </div>
  );
}
