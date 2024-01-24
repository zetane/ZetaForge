"use client";

import { savePipeline } from "@/actions/pipelineSerialization";
import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineName } from "@/atoms/pipelineAtom";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";

export default function SavePipelineButton() {
  const [editor] = useAtom(drawflowEditorAtom);
  const [name] = useAtom(pipelineName);

  const handleClick = async () => {
    const pipelineSpecs = editor.convert_drawflow_to_block(name);
    await savePipeline(pipelineSpecs, name);
  };

  return (
    <div>
      <HeaderMenuItem onClick={handleClick}>Save</HeaderMenuItem>
    </div>
  );
}
