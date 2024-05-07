import { useMutation } from "@tanstack/react-query";
import { Stop } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import axios from "axios";

export const PipelineStopButton = ({executionId}) => {
  console.log("key: ", executionId)
  const mutation = useMutation({
    mutationFn: async () => {
      return axios.delete(`${import.meta.env.VITE_EXECUTOR}/execution/${executionId}`)
    },
  })

  const svgOverride = { position: 'absolute', right: '15px', top: '5px'}
  const buttonStyles = { margin: '5px' }

  let stopText = "Stop"
  if (mutation.isLoading) {
    stopText = "Stopping.."
  }

  return (
    <Button size="sm" style={buttonStyles} disabled={mutation.isLoading} onClick={() => {mutation.mutateAsync()} }>
      Stop
      <Stop size="20" style={svgOverride} />
    </Button>
  )

}