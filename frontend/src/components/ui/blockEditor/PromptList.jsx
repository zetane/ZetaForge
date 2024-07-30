import { useAtom } from "jotai";
import Prompt from "./Prompt";
import { trpc } from "@/utils/trpc";
import { blockEditorRootAtom } from "@/atoms/editorAtom";

export default function PromptList() {
  const [blockPath] = useAtom(blockEditorRootAtom)
  const history = trpc.chat.history.get.useQuery({ blockPath });
  const historyData = history?.data ?? [];
  const updateHistory = trpc.chat.history.update.useMutation({
    onSuccess(input) {
      utils.chat.history.get.invalidate({ blockPath });
    },
  });

  const index = trpc.chat.index.get.useQuery({ blockPath });
  const indexData = index?.data ?? [];
  const updateIndex = trpc.chat.index.update.useMutation({
    onSuccess(input) {
      utils.chat.index.get.invalidate({ blockPath });
    },
  });

  return(<div>
    Prompt {historyData.length}

    {historyData.map(({prompt}) => <Prompt>{prompt}</Prompt>)}
  </div>)
}
