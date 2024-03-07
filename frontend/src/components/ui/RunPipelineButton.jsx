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
      return axios.post(`${import.meta.env.VITE_EXECUTOR}/run`, pipeline)
    },
  })

  const runPipeline = async (editor, pipeline) => {
    const pipelineSpecs = editor.convert_drawflow_to_block(pipeline.name);
    try {
      // tries to put history in a user path if it exists, if not
      // will put it into the buffer path (.cache)
      pipelineSpecs['sink'] = pipeline.path ? pipeline.path : pipeline.buffer
      // Pull containers from the buffer to ensure the most recent ones
      // In the case where a user has a savePath but a mod has happened since
      // Last save
      // TODO: Set a flag (right now it's a timestamp)
      // and break the cache when user mods the canvas
      pipelineSpecs['build'] = pipeline.buffer

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
