import { isBlockEditorOpenAtom } from "@/atoms/editorAtom";
import Editor from "@/components/ui/blockEditor/Editor";
import { useAtom } from "jotai";

export default function BlockEditorPanel() {
  const [isEditorOpen] = useAtom(isBlockEditorOpenAtom);

  return <>{isEditorOpen ? <Editor /> : null}</>;
}
