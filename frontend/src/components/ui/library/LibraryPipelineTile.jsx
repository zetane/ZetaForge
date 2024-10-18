import { trpc } from "@/utils/trpc";
import { Information } from "@carbon/icons-react";
import { Tile } from "@carbon/react";
import Tooltip from "@/components/ui/Tooltip";

const usePipelineCoverImagePath = (pipelineId) => {
  const { data, isLoading, error } = trpc.getPipelineCoverImagePath.useQuery({
    pipelineId,
  });

  return {
    coverImagePath: data?.coverImagePath,
    isLoading,
    error,
  };
};

const dragStartHandlerPipeline = (event, pipeline) => {
  let pipelineData = JSON.stringify(pipeline);
  event.dataTransfer.setData("pipeline", pipelineData);
};

export const LibraryPipelineTile = ({ pipeline, index }) => {
  const pipelineId = pipeline.specs.id;
  const pipelineName = pipeline.specs.name;
  const pipelineDescription = pipeline.specs.description;
  const backgroundColor = "var(--pipeline-background-color)";

  // Use the custom hook to fetch the cover image path
  const { coverImagePath, isLoading } = usePipelineCoverImagePath(pipelineId);

  const handleImageError = (e) => {
    e.target.style.display = "none"; // Hide the image if it fails to load
  };

  return (
    <Tile className="library-tile relative" key={index}>
      <div
        draggable={true}
        onDragStart={(ev) => {
          dragStartHandlerPipeline(ev, pipeline);
        }}
      >
        <div
          className="library-header"
          title={pipelineName}
          style={{ backgroundColor: backgroundColor }}
        >
          {pipelineName}
        </div>
        <div className="image-container relative h-[128px] overflow-hidden">
          {isLoading ? (
            <div className="flex h-full items-center justify-center"></div>
          ) : (
            <img
              src={coverImagePath}
              alt={pipelineName}
              className="absolute left-0 top-0 h-full w-full object-contain"
              style={{ zIndex: 0, opacity: 1.0 }}
              onError={handleImageError}
            />
          )}
        </div>
      </div>
      <div className="absolute bottom-1 left-2 z-10">
        <Tooltip label={pipelineDescription} className={"w-40"}>
          <Information size={20} />
        </Tooltip>
      </div>
    </Tile>
  );
};

export default LibraryPipelineTile;
