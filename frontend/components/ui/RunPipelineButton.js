"use client";

import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { HeaderGlobalAction } from "@carbon/react";
import { useAtom } from "jotai";
import { PlayFilledAlt } from "@carbon/icons-react"
import { pipelineName } from "@/atoms/pipelineAtom";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { savePipeline } from "@/actions/pipelineSerialization";

export default function RunPipelineButton() {
  const [editor] = useAtom(drawflowEditorAtom);
  const [name] = useAtom(pipelineName);

  const mutation = useMutation({
    mutationFn: (pipeline) => {
      // TODO: Do better
      return axios.post('http://localhost:8080/run', pipeline)
    },
  })

  const runPipeline = async (editor) => {
    const pipelineSpecs = editor.convert_drawflow_to_block(name);
    console.log(pipelineSpecs)
    await savePipeline(pipelineSpecs, name);
    const jsonString = JSON.stringify(pipelineSpecs);
    console.log(jsonString);
    mutation.mutate(jsonString)
  };

  return (
    <HeaderGlobalAction aria-label="Run" >
      <PlayFilledAlt size={20} onClick={() => {runPipeline(editor)}}/>
    </HeaderGlobalAction>
  );
}
