import { useMutation } from "@tanstack/react-query";
import { Deploy, SubtractAlt } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import { deployPipeline } from "@/client/anvil";
import { useQueryClient } from "@tanstack/react-query";

export const PipelineDeployButton = ({
  deployed,
  uuid,
  hash,
  configuration,
}) => {
  const queryClient = useQueryClient();

  const deploy = useMutation({
    mutationFn: async () => {
      return await deployPipeline(configuration, uuid, hash);
    },
  });

  const mutationAction = async () => {
    try {
      const result = await deploy.mutateAsync();

      // Update the React Query cache
      queryClient.setQueryData(["pipelines"], (oldExecutions) => {
        return oldExecutions.map((execution) => {
          if (execution.Hash === hash) {
            console.log("updating ", hash);
            // Update the deployed status of the matching pipeline
            return {
              ...execution,
              Deployed: true,
            };
          }
          return execution;
        });
      });
    } catch (error) {
      // todo pop error modal
      console.error("Failed to deploy pipeline:", error);
    }
  };

  const svgOverride = { position: "absolute", right: "15px", top: "5px" };
  const buttonStyles = { margin: "5px" };
  const zIndex = { zIndex: 1 };

  let deployButton = (
    <div style={zIndex}>
      Deploy
      <Deploy size="20" style={svgOverride} />
    </div>
  );

  if (deployed) {
    deployButton = (
      <div style={zIndex}>
        Terminate
        <SubtractAlt size="20" style={svgOverride} />
      </div>
    );
  }

  return (
    <Button size="sm" style={buttonStyles} onClick={() => mutationAction()}>
      {deployButton}
    </Button>
  );
};
