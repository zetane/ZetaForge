import { useMutation } from "@tanstack/react-query";
import { Stop } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import axios from "axios";

export const PipelineStopButton = ({executionId, configuration}) => {
  const terminate = useMutation({
    mutationFn: async () => {
      const url = `http://${configuration.host}:${configuration.anvilPort}/execution/${executionId}/terminate`
      const res = axios.post(url)
      return res.data
    },
  })

  const mutationAction = () => {
    terminate?.mutateAsync()
  }

  const svgOverride = { position: 'absolute', right: '15px', top: '5px'}
  const buttonStyles = { margin: '5px' }

  let stopButton = (<div>
      Stop
      <Stop size="20" style={svgOverride} />
    </div>)

  if (terminate?.isLoading) {
    stopButton = (<div>"Stopping.."</div>)
  }

  console.log(terminate)
  const disabled = (terminate?.isLoading || !executionId)

  return (
    <Button size="sm" style={buttonStyles} disabled={disabled} onClick={() => mutationAction()}>
      { stopButton }
    </Button>
  )
}
