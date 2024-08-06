import { Button } from "@carbon/react";
import { Save } from "@carbon/icons-react";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { compilationErrorToastAtom } from "@/atoms/compilationErrorToast";
import { useAtom } from "jotai";
import { trpc } from "@/utils/trpc";
import { useImmerAtom } from "jotai-immer";
import { useState } from "react";
import { updateSpecs } from "@/utils/specs";
import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { EditorCodeMirror } from "./CodeMirrorComponents";

export default function CodeEditor({ pipelineId, blockId, currentFile }) {
  const fileContent = trpc.block.file.byPath.get.useQuery({
    pipelineId: pipelineId,
    blockId: blockId,
    path: currentFile.relativePath,
  });
  const updateFileContent = trpc.block.file.byPath.update.useMutation();
  const [fileContentBuffer, setFileContentBuffer] = useState(fileContent.data);


  const [editor] = useAtom(drawflowEditorAtom);
  const compileComputation = trpc.compileComputation.useMutation();
  const saveBlockSpecs = trpc.saveBlockSpecs.useMutation();
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [, setCompilationErrorToast] = useAtom(compilationErrorToastAtom);

  const saveChanges = async () => {
    await updateFileContent.mutateAsync({
      pipelineId,
      blockId: blockId,
      path: currentFile.relativePath,
      content: fileContentBuffer,
    });

    if (isComputation) {
      //TODO extract to hook
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
          draft.data[blockKey] = newSpecs;
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
  };

  const onChange = (newValue) => {
    setFileContentBuffer(newValue);
  };

  return (
    <>
      <EditorCodeMirror
        code={fileContent.data || ""} //TODO loading state
        onChange={onChange}
      />
      <div className="absolute right-8 top-2">
        <Button
          renderIcon={Save}
          iconDescription="Save code"
          tooltipPosition="left"
          hasIconOnly
          size="md"
          onClick={saveChanges}
        />
      </div>
    </>
  );
}
