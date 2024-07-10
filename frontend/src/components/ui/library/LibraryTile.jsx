import { trpc } from "@/utils/trpc";
import { Information } from "@carbon/icons-react";
import { Tile } from "@carbon/react";
import Tooltip from "@/components/ui/Tooltip";

const useBlockCoverImagePath = (blockId) => {
  const { data, isLoading, error } = trpc.getBlockCoverImagePath.useQuery({
    blockId,
  });

  return {
    coverImagePath: data?.coverImagePath,
    isLoading,
    error,
  };
};

const dragStartHandler = (event, block) => {
  if (event.type === "touchstart") {
    // TODO: Handle mobile touchstarts
    //mobile_item_selec = ev.target.closest(".drag-drawflow").getAttribute('data-node');
  } else {
    // Note: If this is too slow we need to pass a reference ID around
    // And retrieve the block from a global block store
    let blockData = JSON.stringify(block);
    event.dataTransfer.setData("block", blockData);
  }
};

export const LibraryTile = ({ block, index }) => {
  const blockId = block.information.id;
  const blockName = block.information.name;
  const blockDescription = block.information.description;
  const backgroundColor =
    block.views?.node?.title_bar?.background_color ||
    "var(--title-background-color)";

  // Use the custom hook to fetch the cover image path
  const { coverImagePath, isLoading } = useBlockCoverImagePath(blockId);

  const handleImageError = (e) => {
    e.target.style.display = "none"; // Hide the image if it fails to load
  };

  return (
    <Tile className="library-tile relative" 
      key={index}
    >
      <div
        draggable={true}
        onDragStart={(ev) => {
          dragStartHandler(ev, block);
        }}
      >
        <div
          className="library-header"
          title={blockName}
          style={{ backgroundColor: backgroundColor }}
        >
          {blockName}
        </div>
        <div className="image-container relative h-[128px] overflow-hidden">
          {isLoading ? (
            <div className="flex h-full items-center justify-center"></div>
          ) : (
            <img
              src={coverImagePath}
              alt={blockName}
              className="absolute left-0 top-0 h-full w-full object-contain"
              style={{ zIndex: 0, opacity: 1.0 }}
              onError={handleImageError}
            />
          )}
        </div>
      </div>
      <div className="absolute bottom-1 left-2 z-10">
        <Tooltip label={blockDescription}>
          <Information size={20} />
        </Tooltip>
      </div>
    </Tile>
  );
};

export default LibraryTile;
