import React from 'react';
import { LogsCodeMirror } from "@/components/ui/blockEditor/CodeMirrorComponents";
import ClosableModal from "./modal/ClosableModal";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { useAtomValue } from "jotai";
import ScrollToBottom from 'react-scroll-to-bottom';

export const PipelineLogs = () => {
  const pipeline = useAtomValue(pipelineAtom);

  return (
    <ClosableModal
      modalHeading="Pipeline Logs"
      passiveModal={true}
      modalClass="custom-modal-size"
    >
      <ScrollToBottom className="viewer-container">
        <div className="logs-viewer">
          <LogsCodeMirror code={pipeline.log.join("\n")} />
        </div>
      </ScrollToBottom>
    </ClosableModal>
  );
};
