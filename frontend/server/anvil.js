import { logger } from "./logger";
import { HttpStatus, ServerError } from "./serverError";

export async function getBuildContextStatus(configuration, pipelineSpecs) {
  const response = await handleRequest(
    buildPath(
      DEFAULT_SCHEME,
      configuration.anvil.host,
      configuration.anvil.port,
      "build-context-status",
    ),
    HttpMethod.POST,
    {},
    pipelineSpecs,
  );

  const body = await response.json();

  return body;
}

export async function createExecution(
  configuration,
  executionId,
  pipelineSpecs,
  rebuild,
) {
  const sortedPipelines = buildSortKeys(pipelineSpecs);
  const response = await handleRequest(
    buildPath(
      DEFAULT_SCHEME,
      configuration.anvil.host,
      configuration.anvil.port,
      "execute",
    ),
    HttpMethod.POST,
    {},
    {
      id: executionId,
      pipeline: sortedPipelines,
      build: rebuild,
    },
  );


  if (!response.ok) {
    const errorMessage = await response.text()
    throw new ServerError(`Anvil could not start the execution: ${errorMessage}`, HttpStatus.BAD_REQUEST, null)
  }

  const body = await response.json();
  return body;
}

const DEFAULT_SCHEME = "http";

const HttpMethod = {
  GET: "GET",
  POST: "POST",
};

function buildPath(scheme, host, port, path) {
  const base = `${scheme}://${host}:${port}`;
  const url = new URL(path, base);
  return url;
}

async function handleRequest(url, method, headers, body = null) {
  try {
    const response = await fetch(url, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : null,
    });
    return response;
  } catch (error) {
    const message = `Anvil request failed: ${error}`;
    logger.error(message);
    throw new Error(message);
  }
}

const buildSortKeys = (specs) => {
  for (const blockId in specs.pipeline) {
    const orderObject = {
      input: [],
      output: [],
    };

    const block = specs.pipeline[blockId];
    const inputKeys = Object.keys(block.inputs);
    const outputKeys = Object.keys(block.outputs);

    orderObject.input = (inputKeys);
    orderObject.output = (outputKeys);

    block.views.node.order = orderObject
  }

  return specs
}
