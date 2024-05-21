import { Button } from "@carbon/react";
import { useAtom } from "jotai";
import { modalContentAtom } from "@/atoms/modalAtom";
import { ExecutionDataGrid } from "@/components/ui/ExecutionDataGrid";
import { useImmerAtom } from "jotai-immer";
import { workspaceAtom } from "@/atoms/pipelineAtom";

export default function PipelinesButton() {
  const [modalContent, setModalContent] = useAtom(modalContentAtom);
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const modalPopper = (content) => {
    setModalContent({
      ...modalContent,
      show: true,
      content: content,
    });
  };

  const styles = {
    margin: '5px',
  };

  let executionsCount = 0;
  if (workspace?.pipelines) {
    executionsCount = Object.keys(workspace.running()).length
  }

  const svgOverride = { position: 'absolute', right: '15px', top: '5px'}
  return (
    <Button style={styles} size="sm" kind="secondary" onClick={() => modalPopper(<ExecutionDataGrid />)}>
      Running ({executionsCount})
    </Button>
  )
}
