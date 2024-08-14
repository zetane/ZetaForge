import { logger } from "./logger";
import { HttpStatus, ServerError } from "./serverError";
import { HttpMethod } from "../utils/HttpMethod";
import { buildUrl } from "../utils/urlBuilder";
import { LOCAL_DOMAINS } from "../utils/constants";

export async function getBuildContextStatus(configuration, pipelineSpecs, rebuild) {
  const response = await handleRequest(
    buildUrl(
      getScheme(configuration.anvil.host),
      configuration.anvil.host,
      configuration.anvil.port,
      "build-context-status",
    ),
    HttpMethod.POST,
    configuration.anvil.token,
    {},
    {
      rebuild: rebuild,
      pipeline: pipelineSpecs,
    }
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
    buildUrl(
      getScheme(configuration.anvil.host),
      configuration.anvil.host,
      configuration.anvil.port,
      "execute",
    ),
    HttpMethod.POST,
    configuration.anvil.token,
    {},
    {
      id: executionId,
      pipeline: sortedPipelines,
      build: rebuild,
    },
  );

  if (!response.ok) {
    const errorMessage = await response.text();
    throw new ServerError(
      `Anvil could not start the execution: ${errorMessage}`,
      HttpStatus.BAD_REQUEST,
      null,
    );
  }

  const body = await response.json();
  return body;
}

function getScheme(host) {
  return LOCAL_DOMAINS.includes(host) ? "http" : "https";
}

async function handleRequest(url, method, token, headers, body = null) {
  if (token) {
    headers = {
      ...headers,
      Authorization: `Bearer ${token}`,
    };
  }

  try {
    const response = await fetch(url, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : null,
    });
    return response;
  } catch (error) {
    const message = "Anvil request failed";
    logger.error(error, message);
    throw new ServerError(message, HttpStatus.INTERNAL_SERVER_ERROR, error);
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

    orderObject.input = inputKeys;
    orderObject.output = outputKeys;

    block.views.node.order = orderObject;
  }

  return specs;
};
