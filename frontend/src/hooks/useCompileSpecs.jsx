import { pipelineAtom } from "@/atoms/pipelineAtom";
import { compilationErrorToastAtom } from "@/atoms/compilationErrorToast";
import { updateSpecs } from "@/utils/specs";
import { useAtom } from "jotai";
import { useImmerAtom } from "jotai-immer";
import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { trpc } from "@/utils/trpc";

export const useCompileComputation = () => {
  const [editor] = useAtom(drawflowEditorAtom);
  const compileComputation = trpc.compileComputation.useMutation();
  const saveBlockSpecs = trpc.saveBlockSpecs.useMutation();
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [, setCompilationErrorToast] = useAtom(compilationErrorToastAtom);

  const compile = async (pipelineId, blockId) => {
      try {
        const newSpecsIO = await compileComputation.mutateAsync({
          pipelineId: pipelineId,
          blockId: blockId,
        });
        const newSpecs = await updateSpecs(
          blockId,
          newSpecsIO,
          pipeline.data,
          editor,
        );
        setPipeline((draft) => {
          draft.data[blockId] = newSpecs;
        });
        await saveBlockSpecs.mutateAsync({//TODO check if it's still required
          blockPath: blockPath,
          blockSpecs: newSpecs,
        });
      } catch (error) {
        console.error(error);
        setCompilationErrorToast(true);
      }
  }
  return compile
}


