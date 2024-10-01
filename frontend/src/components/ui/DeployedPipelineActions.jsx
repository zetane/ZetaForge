import { ComboButton, MenuItem, CodeSnippet } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { modalContentAtom } from "@/atoms/modalAtom";
import { useAtom } from "jotai";
import ClosableModal from "./modal/ClosableModal";
import { getScheme } from "@/client/anvil";

export const DeployedPipelineActions = ({
  uuid,
  hash,
  configuration,
  pipelineData,
}) => {
  const [modalContent, setModalContent] = useAtom(modalContentAtom);
  const generatePostPayload = () => {
    // Generate input structure based on the pipeline graph
    const inputs = {};
    Object.entries(pipelineData.pipeline).forEach(([, node]) => {
      if (node.inputs) {
        Object.entries(node.inputs).forEach(([inputName, input]) => {
          if (input.connections && input.connections.length > 0) {
            const connection = input.connections[0];
            const sourceNode = pipelineData.pipeline[connection.block];
            if (
              sourceNode &&
              sourceNode.action &&
              sourceNode.action.parameters
            ) {
              const param = sourceNode.action.parameters[connection.variable];
              if (param) {
                inputs[inputName] = param.value;
              }
            }
          }
        });
      }
    });

    const pythonCode = `
from zetaforge import Zetaforge

zetaforge = Zetaforge(base_url='${getScheme(configuration.anvil.host)}://${configuration.anvil.host}:${configuration.anvil.port}', token='${configuration.anvil.token}')

pipeline_uuid = '${uuid}'
pipeline_hash = '${hash}'

inputs = ${JSON.stringify(inputs, null, 2)}

result = zetaforge.execute_pipeline(pipeline_uuid, pipeline_hash, inputs)
print('Pipeline execution result:', result)
    `;

    // Update modal content
    setModalContent({
      ...modalContent,
      content: (
        <ClosableModal
          modalHeading="POST payload"
          passiveModal={true}
          modalClass="custom-modal-size"
        >
          <CodeSnippet type="multi" feedback="Copied to clipboard">
            {pythonCode}
          </CodeSnippet>
        </ClosableModal>
      ),
    });
  };

  const handleUndeploy = () => {
    // Stub for undeploy action
    console.log("Undeploying pipeline:", uuid);
    // Here you would typically call an API endpoint to undeploy the pipeline
    // For now, we'll just log the action
  };

  return (
    <ComboButton size="sm" label="Payload" onClick={generatePostPayload}>
      <MenuItem
        label="Undeploy"
        onClick={handleUndeploy}
        renderIcon={TrashCan}
        kind="danger"
      />
    </ComboButton>
  );
};
