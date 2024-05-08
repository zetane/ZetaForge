import { Button } from "@carbon/react";
import { useAtom } from "jotai";
import { modalContentAtom } from "@/atoms/modalAtom";
import { ExecutionDataGrid } from "@/components/ui/ExecutionDataGrid";
import { executionAtom } from "@/atoms/executionAtom";
import { useImmerAtom } from "jotai-immer";

export default function RunningButton() {
  const [modalContent, setModalContent] = useAtom(modalContentAtom);
  const [executions, setExecutions] = useImmerAtom(executionAtom);
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
  if (executions?.executions) {
    executionsCount = Object.keys(executions.executions).length
  }

  console.log(executions.executions)

  const svgOverride = { position: 'absolute', right: '15px', top: '5px'}
  return (
    <Button style={styles} size="sm" kind="secondary" onClick={() => modalPopper(<ExecutionDataGrid />)}>
      Running ({executionsCount})
    </Button>
  )
}