import { useState } from "react";
import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  ComboButton,
  CodeSnippet,
} from "@carbon/react";
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

    const pythonCode = `from zetaforge import Zetaforge

zetaforge = Zetaforge(address='${getScheme(configuration.anvil.host)}://${configuration.anvil.host}:${configuration.anvil.port}', token='${configuration.anvil.token}')

result = zetaforge.run('${name}:${hash.substring(0, 8)}', input=${JSON.stringify(inputs, null, 2)})
print('Pipeline execution result:', result)
`;

    const jsCode = `import Zetaforge from "zetaforge";

const zetaforge = new Zetaforge({
  '${getScheme(configuration.anvil.host)}://${configuration.anvil.host}:${configuration.anvil.port}',
  '${configuration.anvil.token}'
});

const pipelineUuid = "${uuid}";
const pipelineHash = "${hash}";
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
      <ComboButton
        size="sm"
        label="Payload"
        onClick={generatePostPayload}
      ></ComboButton>

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
          <Tabs>
            <TabList aria-label="Code Tabs" contained>
              <Tab>JavaScript</Tab>
              <Tab>Python</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <CodeSnippet type="multi" feedback="Copied to clipboard">
                  {codePayload.jsCode}
                </CodeSnippet>
              </TabPanel>
              <TabPanel>
                <CodeSnippet type="multi" feedback="Copied to clipboard">
                  {codePayload.pythonCode}
                </CodeSnippet>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ClosableModal>
      )}
    </>
  );
};
