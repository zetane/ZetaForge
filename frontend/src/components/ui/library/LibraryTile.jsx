import { trpc } from '@/utils/trpc';
import { Information } from "@carbon/icons-react";
import { Tile } from '@carbon/react';
import Tooltip from '../Tooltip';


const useBlockCoverImagePath = (blockId) => {
  const { data, isLoading, error } = trpc.getBlockCoverImagePath.useQuery({ blockId });

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
    let blockData = JSON.stringify(block)
    event.dataTransfer.setData("block", blockData);
  }
}

export const LibraryTile = ({ block, index }) => {
    const blockId = block.information.id;
    const blockName = block.information.name;
    const blockDescription = block.information.description;
    const backgroundColor = block.views?.node?.title_bar?.background_color || 'var(--title-background-color)';
  
    // Use the custom hook to fetch the cover image path
    const { coverImagePath, isLoading } = useBlockCoverImagePath(blockId);
  
    const handleImageError = (e) => {
      e.target.style.display = 'none'; // Hide the image if it fails to load
    };
  
    return (
      <Tile className="library-tile relative"
        key={index}
        draggable={true}
        onDragStart={(ev) => { dragStartHandler(ev, block) }}>
        <div className="library-header" title={blockName} style={{ backgroundColor: backgroundColor }}>
          {blockName}
        </div>
        <div className="h-[128px] relative overflow-hidden image-container">
          {isLoading ? (
            <div className="flex justify-center items-center h-full"></div>
          ) : (
            <img src={coverImagePath} alt={blockName} className="object-contain w-full h-full absolute top-0 left-0" style={{ zIndex: 0, opacity: 1.0 }} onError={handleImageError} />
          )}
        </div>
        <div className="absolute bottom-1 left-2 z-10">
          <Tooltip
            defaultOpen
            align="bottom-left"
            label={blockDescription} >
            <Information size={20} />
          </Tooltip>
        </div>
      </Tile>
    );
  };
  
  export default LibraryTile;

  