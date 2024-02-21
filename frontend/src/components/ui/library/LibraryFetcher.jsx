import LibraryWrapper from "./LibraryWrapper";
import { trpc } from '@/utils/trpc'

export default function LibraryFetcher() {
  const blockQuery = trpc.getBlocks.useQuery();
  const blocks = blockQuery?.data || []

  return (
    <div>
      <LibraryWrapper specs={blocks}/>
    </div>
  )
}