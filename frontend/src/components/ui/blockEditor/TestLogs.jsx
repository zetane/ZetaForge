import { trpc } from "@/utils/trpc";
import { PlayFilled } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import { useState } from "react";
import { LogsCodeMirror } from "./directoryViewer/CodeMirrorComponents";
import ScrollToBottom from "react-scroll-to-bottom";

const LogsViewer = ({ blockId, pipelineId }) => {
  const [isRunButtonPressed, setIsRunButtonPressed] = useState(false);

  const logs = trpc.block.log.get.useQuery(
    { pipelineId, blockId },
    { enabled: isRunButtonPressed, refetchInterval: 1000 },
  );
  const runTest = trpc.runTest.useMutation();

  const handleDockerCommands = async () => {
    setIsRunButtonPressed(true);
    await runTest.mutateAsync({ pipelineId, blockId });
  };

  return (
    <div className="flex h-full flex-col">
      <Button
        renderIcon={PlayFilled}
        iconDescription="Run test"
        size="sm"
        onClick={handleDockerCommands}
        title="Run test from this block folder"
        style={{ marginBottom: "20px" }}
      >
        Run Test
      </Button>
      <ScrollToBottom className="min-h-0 flex-1">
        <LogsCodeMirror code={logs.data ?? ""} />
      </ScrollToBottom>
    </div>
  );
};

export default LogsViewer;
