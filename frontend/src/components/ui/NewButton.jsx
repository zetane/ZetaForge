import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";
import { useImmerAtom } from 'jotai-immer'
import { customAlphabet } from 'nanoid'
import {trpc} from "@/utils/trpc"

export default function NewButton() {
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  // trpc.getCachePath.useQuery();
  
  

  const cacheQuery = trpc.getCachePath.useQuery();
  const cachePath = cacheQuery?.data || ""

  const handleClick = async (editor, pipeline) => {
    const nanoid = customAlphabet('1234567890abcedfghijklmnopqrstuvwxyz', 12)
    const name = `pipeline-${nanoid()}`
    const bufferPath = `${cachePath}${name}`
    setPipeline((draft) => {
      draft.id = name,
      draft.name = name,
      draft.saveTime = null,
      draft.buffer = bufferPath,
      draft.path = undefined,
      draft.data = {}
    })
  };

  return (
    <div>
      <HeaderMenuItem onClick={() => handleClick(editor)}>New</HeaderMenuItem>
    </div>
  );
}
