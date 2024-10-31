import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineAtom, pipelineFactory } from "@/atoms/pipelineAtom";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";
import { trpc } from "@/utils/trpc";
import { useWorkspace } from "@/hooks/useWorkspace";

export default function NewFromCurrent() {
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline] = useAtom(pipelineAtom);
  const copyPipeline = trpc.copyPipeline.useMutation();
  const { addPipeline } = useWorkspace();

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
