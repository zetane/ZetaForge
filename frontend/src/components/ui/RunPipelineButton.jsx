import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pipelineSchemaAtom } from "@/atoms/pipelineSchemaAtom";
import { mixpanelAtom } from "@/atoms/mixpanelAtom";
import generateSchema from '@/utils/schemaValidation';
import { trpc } from "@/utils/trpc";
import { Button } from "@carbon/react";
import axios from "axios";
import { useAtom } from "jotai";
import { useImmerAtom } from "jotai-immer";
import { useRef, useState } from "react";
import { uuidv7 } from "uuidv7";
import ClosableModal from "./modal/ClosableModal";
import { workspaceAtom } from "@/atoms/pipelineAtom";

export default function RunPipelineButton({modalPopper, children, action}) {
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom)
  const [validationErrorMsg, setValidationErrorMsg] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mixpanelService] = useAtom(mixpanelAtom)

  const uploadParameterBlocks = trpc.uploadParameterBlocks.useMutation();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (execution) => {
      return axios.post(`${import.meta.env.VITE_EXECUTOR}/execute`, execution)
    },
  })

  const runPipeline = async (editor, pipeline) => {
    // check if pipeline structure exists
    if (!pipeline.data || !Object.keys(pipeline.data).length) return null;
    setValidationErrorMsg([])

    let pipelineSpecs = editor.convert_drawflow_to_block(pipeline.name, pipeline.data);
    const executionId = uuidv7();
    try {
      pipelineSpecs = await uploadParameterBlocks.mutateAsync({
        pipelineId: pipeline.id,
        executionId: executionId,
        pipelineSpecs: pipelineSpecs,
        buffer: pipeline.buffer,
      });
    } catch (error) {
      setValidationErrorMsg([`Failed to upload files to anvil server: ${error}`])
      setIsOpen(true)
      return null;
    }

    const schema = generateSchema(pipeline.data);
    const results = schema.safeParse(pipeline.data);

    if (!results.success) {
      setValidationErrorMsg(prev => {
        return results.error.issues.map(block => `${block.path[0]}: ${block.message}`)
      })
      setIsOpen(true)
      return null;
    } else {
      setValidationErrorMsg([]);
    }

    try {
      // tries to put history in a user path if it exists, if not
      // will put it into the buffer path (.cache)
      pipelineSpecs['sink'] = pipeline.path ? pipeline.path : pipeline.buffer
      // Pull containers from the buffer to ensure the most recent ones
      // In the case where a user has a savePath but a mod has happened since
      // Last save
      // TODO: Set a flag (right now it's a timestamp)
      // and break the cache when user mods the canvas
      pipelineSpecs['build'] = pipeline.buffer
      pipelineSpecs['name'] = pipeline.name
      pipelineSpecs['id'] = pipeline.id
      const rebuild = (action == "Rebuild")
      const execution = {
        id: executionId,
        pipeline: pipelineSpecs,
        build: rebuild
      }

      const res = await mutation.mutateAsync(execution)
      if (res.status == 201) {
        setPipeline((draft) => {
          draft.socketUrl = `${import.meta.env.VITE_WS_EXECUTOR}/ws/${executionId}`;
          draft.log = []
        })
        setWorkspace((draft) => {
          draft.fetchInterval = 1 * 1000;
        })
      }
      try {
        mixpanelService.trackEvent('Run Created')
      } catch (err) {

      }

    } catch (error) {
      setValidationErrorMsg([error.message])
      setIsOpen(true)
    }
  };

  const styles = {
    margin: '5px',
  };

  return (
    <>
      <Button style={styles} size="sm" onClick={() => { runPipeline(editor, pipeline) }}>
        <span>{ action }</span>
        { children }
      </Button>

      <ClosableModal
        modalHeading="The following error(s) occurred:"
        passiveModal={true}
        open={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <div className="flex flex-col gap-4 p-3">
          {validationErrorMsg.map((error, i) => {
            return (
              <p key={"error-msg-"+i}>{error}</p>
            )
          })}
        </div>
      </ClosableModal>
    </>
  );
}
