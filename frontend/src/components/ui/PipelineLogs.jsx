import { LogsCodeMirror } from "@/components/ui/blockEditor/CodeMirrorComponents";
import ClosableModal from "./modal/ClosableModel";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { useAtomValue } from "jotai";

export const PipelineLogs = () => {
  const pipeline = useAtomValue(pipelineAtom);
  return (
    <ClosableModal
      modalHeading="Pipeline Logs"
      secondaryButtonText="Close">
    <div className="code-container centered-container">
      <div className="viewer-container">
        <div className="logs-viewer">
          <LogsCodeMirror code={pipeline.log.join("")} />
        </div>
      </div>
    </div>
    </ClosableModal>
  );
}