import { useAtom } from "jotai";
import Prompt from "./Prompt";
import { trpc } from "@/utils/trpc";
import { blockEditorRootAtom } from "@/atoms/editorAtom";

export default function PromptList({onSelectPrompt}) {
  const [blockPath] = useAtom(blockEditorRootAtom);
  const history = trpc.chat.history.get.useQuery({ blockPath });
  const historyData = history?.data ?? [];

  return (
    <div className="p-3">
      <div className="pb-5">Prompts ({historyData.length})</div>
      <div className="flex flex-col">
        {historyData.map(({ prompt, response }, index) => (
          <Prompt key={index} response={response} onSelectPrompt={onSelectPrompt}>{prompt}</Prompt>
        ))}
      </div>
    </div>
  );
}
