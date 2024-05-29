import { Button } from "@carbon/react";
import { useAtom } from "jotai";
import { modalContentAtom } from "@/atoms/modalAtom";
import { ExecutionDataGrid } from "@/components/ui/ExecutionDataGrid";
import { useImmerAtom } from "jotai-immer";
import { workspaceAtom, getRunning } from "@/atoms/pipelineAtom";
import { useEffect, useState } from "react";

export default function PipelinesButton() {
  const [modalContent, setModalContent] = useAtom(modalContentAtom);
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const [executions, setExecutions] = useState(0);
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

  useEffect(() => {
    setExecutions(getRunning(workspace))
  }, [workspace?.pipelines])

  let count = 0;
  if (executions) {
    count = executions.length
  }

  console.log("exes: ", executions)

  let grid = (<ExecutionDataGrid executions={executions}/>);

  const svgOverride = { position: 'absolute', right: '15px', top: '5px'}
  return (
    <Button style={styles} size="sm" kind="secondary"
      onClick={ () => modalPopper(grid) }>
      Running ({count})
    </Button>
  )
}
