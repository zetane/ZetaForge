import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";
import { trpc } from "@/utils/trpc";
import { useImmerAtom } from "jotai-immer";
import { mixpanelAtom } from "@/atoms/mixpanelAtom";

export default function SaveAsPipelineButton() {
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [mixpanelService] = useAtom(mixpanelAtom)


  const savePipeline = trpc.savePipeline.useMutation();

  const handleClick = async (editor, pipeline) => {
    try {
      mixpanelService.trackEvent("Save Pipeline");
    } catch (err) {
      console.error(err)
    }
    const pipelineSpecs = editor.convert_drawflow_to_block(
      pipeline.name,
      pipeline.data,
    );
    // If a pipeline is loaded, pipeline.path will be set to the load path
    // If it isn't set, electron will pop a file picker window
    // The response from the server after saving will contain that new path
    pipelineSpecs["sink"] = pipeline.path;
    pipelineSpecs["build"] = pipeline.path;
    pipelineSpecs["name"] = pipeline.name;
    pipelineSpecs["id"] = pipeline.id;
    const saveData = {
      specs: pipelineSpecs,
      name: pipeline.name,
      writeFromDir: pipeline.path,
      writeToDir: undefined,
    };
    const response = await savePipeline.mutateAsync(saveData);
    const { name, dirPath } = response;

    setPipeline((draft) => {
      draft.saveTime = Date.now();
      if (name) {
        draft.name = name;
      }
      if (dirPath) {
        draft.path = dirPath;
      }
    });
  };

  return (
    <div>
      <HeaderMenuItem onClick={() => handleClick(editor, pipeline)}>
        Save As
      </HeaderMenuItem>
    </div>
  );
}
