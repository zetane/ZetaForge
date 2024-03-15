import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";
import { useImmerAtom } from 'jotai-immer'
import { customAlphabet } from 'nanoid'

export default function SavePipelineButton() {
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);

  const handleClick = async (editor, pipeline) => {
    const nanoid = customAlphabet('1234567890abcedfghijklmnopqrstuvwxyz', 12)
    const name = `pipeline-${nanoid()}`
    setPipeline((draft) => {
      draft.name = name,
      draft.saveTime = null,
      draft.buffer = `${import.meta.env.VITE_CACHE_DIR}/${name}/`,
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
