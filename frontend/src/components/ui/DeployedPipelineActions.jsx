import { useState } from "react";
import { ComboButton, MenuItem, Modal, CodeSnippet } from "@carbon/react";
import { Application, TrashCan } from "@carbon/icons-react";
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
    const baseUrl = `${getScheme(configuration.anvil.host)}://${configuration.anvil.host}:${configuration.anvil.port}`;
    const endpoint = `/pipeline/${uuid}/${hash}/execute`;

    // Generate input structure based on the pipeline graph
    const inputs = {};
    Object.entries(pipelineData.pipeline).forEach(([nodeId, node]) => {
      if (node.action && node.action.parameters) {
        Object.entries(node.action.parameters).forEach(([paramName, value]) => {
          inputs[`${nodeId}.${paramName}`] = `${value?.value}`;
        });
      }
    });

    const payload = {
      url: `${baseUrl}${endpoint}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${configuration.anvil.token}`,
      },
      body: JSON.stringify({ inputs }),
    };

    const postPayload = JSON.stringify(payload, null, 2);

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
            {postPayload}
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

  const items = [
    {
      id: "get-payload",
      text: "Get POST Payload",
      onClick: generatePostPayload,
      icon: Application,
    },
    {
      id: "undeploy",
      text: "Undeploy",
      onClick: handleUndeploy,
      icon: TrashCan,
      isDanger: true,
    },
  ];

  return (
    <ComboButton size="sm" label="Get Payload" onClick={generatePostPayload}>
      <MenuItem
        label="Undeploy"
        onClick={handleUndeploy}
        renderIcon={TrashCan}
        kind="danger"
      />
    </ComboButton>
  );
};
