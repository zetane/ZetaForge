import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";
import { trpc } from "@/utils/trpc"
import { useImmerAtom } from 'jotai-immer'

export default function SavePipelineButton() {
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);

  const savePipeline = trpc.savePipeline.useMutation();

  const handleClick = async (editor, pipeline) => {
    const pipelineSpecs = editor.convert_drawflow_to_block(pipeline.name);
    const saveData = {
      specs: pipelineSpecs, 
      name: pipeline.name, 
      buffer: pipeline.buffer,
      writePath: pipeline.path
    }
    const response = await savePipeline.mutateAsync(saveData)
    const {dirPath, specs} = response

    setPipeline((draft) => {
      draft.saveTime = Date.now()
      if (specs) {
        draft.name = specs.split(".")[0]
      }
    })
  };

  return (
    <div>
      <HeaderMenuItem onClick={() => handleClick(editor, pipeline)}>Save Pipeline</HeaderMenuItem>
    </div>
  );
}
