import { blockEditorRootAtom, isBlockEditorOpenAtom } from "@/atoms/editorAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import Editor from "@/components/ui/blockEditor/Editor";
import { useAtom } from "jotai";

export default function BlockEditorPanel() {
  const [isEditorOpen] = useAtom(isBlockEditorOpenAtom);
  const [blockPath] = useAtom(blockEditorRootAtom);
  const [pipeline] = useAtom(pipelineAtom);
  const blockKey = blockPath?.replaceAll("\\", "/").split("/").pop() ?? "";// TODO flaky get the blockId directly

  return (
    <>
      {isEditorOpen && pipeline.data[blockKey] && (
        <Editor key={blockKey} blockKey={blockKey} blockPath={blockPath} hidden />
      )}
    </>
  );
}
