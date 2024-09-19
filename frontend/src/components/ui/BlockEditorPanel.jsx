import { blockEditorIdAtom, isBlockEditorOpenAtom } from "@/atoms/editorAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import Editor from "@/components/ui/blockEditor/Editor";
import { useAtom } from "jotai";
import { useState } from "react";

export default function BlockEditorPanel() {
  const [isEditorOpen] = useAtom(isBlockEditorOpenAtom);
  const [blockId] = useAtom(blockEditorIdAtom);
  const [pipeline] = useAtom(pipelineAtom);
  const [isMaximized, setMaximized] = useState(true);

  const handleToggleMaximize = () => {
    setMaximized((prev) => !prev);
  };

  return (
    <>
      {isEditorOpen && pipeline.data[blockId] && (
        <Editor
          blockId={blockId}
          isMaximized={isMaximized}
          onToggleMaximize={handleToggleMaximize}
        />
      )}
    </>
  );
}
