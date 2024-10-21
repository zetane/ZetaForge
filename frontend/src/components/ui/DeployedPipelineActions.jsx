import { useState } from "react";
import { ComboButton, MenuItem, CodeSnippet } from "@carbon/react";
import { Application, TrashCan } from "@carbon/icons-react";
import { modalContentAtom } from "@/atoms/modalAtom";
import { useAtom } from "jotai";
import ClosableModal from "./modal/ClosableModal";
import { getScheme } from "@/client/anvil";

export const DeployedPipelineActions = ({
  name,
  uuid,
  hash,
  configuration,
  pipelineData,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("js");
  const [codePayload, setCodePayload] = useState({
    jsCode: "",
    pythonCode: "",
  });

  const generatePostPayload = () => {
    const inputs = {};
    Object.entries(pipelineData.pipeline).forEach(([nodeId, node]) => {
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

zetaforge = Zetaforge(address='${getScheme(configuration.anvil.host)}://${configuration.anvil.host}:${configuration.anvil.port}', token='${configuration.anvil.token}')

result = zetaforge.run('${name}:${hash.substring(0, 8)}', input=${JSON.stringify(inputs, null, 2)})
print('Pipeline execution result:', result)
`;

    const jsCode = `
import Zetaforge from "zetaforge";

const zetaforge = new Zetaforge({
  '${getScheme(configuration.anvil.host)}://${configuration.anvil.host}:${configuration.anvil.port}',
  '${configuration.anvil.token}'
});

const pipelineUuid = ${uuid};
const pipelineHash = ${hash};
const inputs = ${JSON.stringify(inputs, null, 2)};

async function executePipeline() {
  try {
    const executeResponse = await zetaforge.run(pipelineUuid, pipelineHash, inputs);
    console.log("executeResponse: ", executeResponse);
  } catch (error) {
    console.error('Failed to execute pipeline:', error.message);
  }
}

executePipeline(); // it will execute the pipeline....
`;
    setCodePayload({ jsCode, pythonCode });
    setIsModalOpen(true);
  };

  const handleClose = () => setIsModalOpen(false);

  const handleUndeploy = () => {
    console.log("Undeploying pipeline:", uuid);
  };

  return (
    <>
      <ComboButton size="sm" label="Payload" onClick={generatePostPayload}>
        <MenuItem
          label="Undeploy"
          onClick={handleUndeploy}
          renderIcon={TrashCan}
          kind="danger"
        />
      </ComboButton>

      {isModalOpen && (
        <ClosableModal
          modalHeading="POST payload"
          passiveModal={true}
          modalClass="custom-modal-size"
          onRequestClose={handleClose}
          style={{
            display: "flex",
            justifyContent: "center",
            maxWidth: "100%",
            width: "100%",
            height: "100%",
            maxHeight: "100%",
            zIndex: "9999",
          }}
        >
          <div style={{ marginBottom: "5px" }}>
            <button
              onClick={() => setActiveTab("js")}
              style={{
                marginRight: "10px",
                backgroundColor: activeTab === "js" ? "#666" : "#444",
                color: "#fff",
                border: "none",
                padding: "10px 15px 10px 10px",
                cursor: "pointer",
                transition: "background-color 0.3s",
              }}
            >
              JavaScript
            </button>
            <button
              onClick={() => setActiveTab("python")}
              style={{
                backgroundColor: activeTab === "python" ? "#666" : "#444",
                color: "#fff",
                border: "none",
                padding: "10px 15px 10px 10px",
                cursor: "pointer",
                transition: "background-color 0.3s",
              }}
            >
              Python
            </button>
          </div>
          <div>
            {activeTab === "js" && (
              <CodeSnippet type="multi" feedback="Copied to clipboard">
                {codePayload.jsCode}
              </CodeSnippet>
            )}
            {activeTab === "python" && (
              <CodeSnippet type="multi" feedback="Copied to clipboard">
                {codePayload.pythonCode}
              </CodeSnippet>
            )}
          </div>
        </ClosableModal>
      )}
    </>
  );
};
