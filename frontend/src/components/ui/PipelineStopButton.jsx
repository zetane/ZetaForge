import { useMutation } from "@tanstack/react-query";
import { Stop } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import { useState } from "react";
import { terminateExecution } from "@/client/anvil";

export const PipelineStopButton = ({ executionId, configuration }) => {
  const [isTerminating, setIsTerminating] = useState(false);
  const terminate = useMutation({
    mutationFn: async () => {
      return await terminateExecution(configuration, executionId);
    },
    onSuccess: (res) => {
      // Hasta la vista, baby
      setIsTerminating(true);
    },
  });

  const mutationAction = () => {
    terminate?.mutateAsync();
  };

  const svgOverride = { position: "absolute", right: "15px", top: "5px" };
  const buttonStyles = { margin: "5px" };

  let stopButton = (
    <div>
      Stop
      <Stop size="20" style={svgOverride} />
    </div>
  );

  if (isTerminating) {
    stopButton = (
      <div>
        Stopping
        <Stop size="20" style={svgOverride} />
      </div>
    );
  }

  return (
    <Button
      className="glowing-border"
      size="sm"
      style={buttonStyles}
      disabled={isTerminating}
      onClick={() => mutationAction()}
    >
      {stopButton}
    </Button>
  );
};
