import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import {
  pipelineAtom,
  pipelineFactory,
  addPipeline,
} from "@/atoms/pipelineAtom";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";
import { trpc } from "@/utils/trpc";

export default function NewFromCurrent() {
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, _] = useAtom(pipelineAtom);
  const copyPipeline = trpc.copyPipeline.useMutation();

  const handleClick = async (editor, pipeline) => {
    const newPipeline = pipelineFactory(await window.cache.local());
    newPipeline.data = pipeline.data;
    const pipelineSpecs = editor.convert_drawflow_to_block(
      newPipeline.name,
      newPipeline.data,
    );
    const saveData = {
      specs: pipelineSpecs,
      name: newPipeline.name,
      writeFromDir: pipeline.path,
      writeToDir: newPipeline.path,
    };
    await copyPipeline.mutateAsync(saveData);
    addPipeline(newPipeline);
  };

  return (
    <div>
      <HeaderMenuItem onClick={() => handleClick(editor, pipeline)}>
        New From Current
      </HeaderMenuItem>
    </div>
  );
}
