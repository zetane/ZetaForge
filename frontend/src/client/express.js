import config from "../../config";
import { buildUrl } from "../../utils/urlBuilder";

export async function uploadFiles(pipelinePath, blockId, files) {
  const formData = buildFormData(pipelinePath, blockId, files);
  return await handleRequest(
    buildUrl(
      config.express.scheme,
      config.express.host,
      config.express.port,
      "import-files",
    ),
    formData,
  );
}

export async function uploadFolders(pipelinePath, blockId, files) {
  const formData = buildFormData(pipelinePath, blockId, files);
  return await handleRequest(
    buildUrl(
      config.express.scheme,
      config.express.host,
      config.express.port,
      "import-folder",
    ),
    formData,
  );
}

function buildFormData(pipelinePath, blockId, files) {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i]);
    formData.append("paths", files[i].webkitRelativePath);
  }

  formData.append("pipelinePath", pipelinePath);
  formData.append("blockId", blockId);

  return formData;
}

async function handleRequest(url, body) {
  try {
    const response = await fetch(url, {
      method: "POST",
      body: body,
    });
    return response;
  } catch (error) {
    const message = `Express request failed: ${error}`;
    console.error(message);
    throw new Error(message);
  }
}
