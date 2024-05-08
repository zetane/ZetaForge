import { useMutation } from "@tanstack/react-query";
import { Stop } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import axios from "axios";

export const PipelineStopButton = ({executionId}) => {
  console.log("key: ", executionId)
  const mutation = useMutation({
    mutationFn: async () => {
      return axios.post(`${import.meta.env.VITE_EXECUTOR}/execution/${executionId}/terminate`)
    },
  })

  const svgOverride = { position: 'absolute', right: '15px', top: '5px'}
  const buttonStyles = { margin: '5px' }

  let stopButton = (<div>
      Stop
      <Stop size="20" style={svgOverride} />
    </div>)
  if (mutation.isLoading) {
    stopButton = (<div>"Stopping.."</div>)
  }

  return (
    <Button size="sm" style={buttonStyles} disabled={mutation.isLoading} onClick={() => {mutation.mutateAsync()} }>
      { stopButton }
    </Button>
  )
}