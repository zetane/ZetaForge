import { Stop } from "@carbon/icons-react";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { useImmerAtom } from "jotai-immer";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@carbon/react";

export default function StopPipelineButton() {
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);


  const mutation = useMutation({
    mutationFn: async (pipeline, hash) => {
      return axios.post(`${import.meta.env.VITE_EXECUTOR}/pipeline/${pipeline.id}/${hash}/stop`, pipeline)
    },
  })

  const stopPipeline = async (pipeline) => {
    const hash = ""
    const res = await mutation.mutateAsync(pipeline, hash)
  }

  const styles = {
    margin: '5px',
  };

  const svgOverride = { position: 'absolute', right: '15px', top: '5px'}

  return (
    <Button style={styles} size="sm" kind="secondary" onClick={() => { stopPipeline(pipeline) }}>
        <span>Stop</span>
        <Stop size={20} style={svgOverride} />
    </Button>
  );
}