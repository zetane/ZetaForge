import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";
import { trpc } from "@/utils/trpc"
import { useImmerAtom } from 'jotai-immer'

export default function SaveAsPipelineButton() {
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);

  const savePipeline = trpc.savePipeline.useMutation();

  const handleClick = async (editor, pipeline) => {
    const pipelineSpecs = editor.convert_drawflow_to_block(pipeline.name);
    // If a pipeline is loaded, pipeline.path will be set to the load path
    // If it isn't set, electron will pop a file picker window
    // The response from the server after saving will contain that new path

    // TODO: the pipelineAtom data and these fields are redundant
    // They should be consolidated
    pipelineSpecs['sink'] = pipeline.path ? pipeline.path : pipeline.buffer
    pipelineSpecs['build'] = pipeline.path ? pipeline.path : pipeline.buffer
    // TODO: blocks need to source their own data
    pipelineSpecs['source'] = pipeline.path ? pipeline.path : pipeline.buffer
    const saveData = {
      specs: pipelineSpecs, 
      name: pipeline.name, 
      buffer: pipeline.buffer,
      writePath: null
    }
    const response = await savePipeline.mutateAsync(saveData)
    const {dirPath, specs} = response

    setPipeline((draft) => {
      draft.saveTime = Date.now()
      if (specs) {
        draft.name = specs.split(".")[0]
      }
      if (dirPath) {
        draft.path = dirPath
      }
    })
  };

  return (
    <div>
      <HeaderMenuItem onClick={() => handleClick(editor, pipeline)}>Save As</HeaderMenuItem>
    </div>
  );
}
