import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { HeaderGlobalAction } from "@carbon/react";
import { useAtom } from "jotai";
import { PlayFilledAlt } from "@carbon/icons-react"
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useImmerAtom } from "jotai-immer";

export default function RunPipelineButton() {
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);

  const mutation = useMutation({
    mutationFn: (pipeline) => {
      // TODO: Do better
      return axios.post('http://localhost:8080/run', pipeline)
    },
  })

  const runPipeline = async (editor, pipeline) => {
    const pipelineSpecs = editor.convert_drawflow_to_block(pipeline.name);
    try {
      pipelineSpecs['sink'] = pipeline.path ? pipeline.path : pipeline.buffer
      pipelineSpecs['build'] = pipeline.buffer

      // TODO: blocks need to source their own data
      pipelineSpecs['source'] = pipeline.path ? pipeline.path : pipeline.buffer
      const res = await mutation.mutateAsync(pipelineSpecs)
      setPipeline((draft) => {
        draft.saveTime = Date.now()
      })
    } catch (error) {

    }
  };

  return (
    <HeaderGlobalAction aria-label="Run" >
      <PlayFilledAlt size={20} onClick={() => {runPipeline(editor, pipeline)}}/>
    </HeaderGlobalAction>
  );
}
