
import LibraryWrapper from "./LibraryWrapper";
import { trpc } from '@/utils/trpc';

export default function LibraryFetcher() {
  const blockQuery = trpc.getBlocks.useQuery();  // Fetch blocks
  const blocks = blockQuery?.data || [];

  const pipelineQuery = trpc.getPipelines.useQuery(); // Fetch pipelines
  const pipelines = pipelineQuery?.data || [];

  return (
    <div>
      <LibraryWrapper specs={blocks} pipelines={pipelines} />
    </div>
  );
}

