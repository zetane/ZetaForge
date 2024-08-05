import { buildUrl } from "../../utils/urlBuilder";

export async function uploadFiles(pipelineId, blockId, files) {
  const formData = buildFormData(pipelineId, blockId, files);
  handleRequest(
    buildUrl("http", "localhost", "3330", "import-files"),
    formData,
  );
}

export async function uploadFolders(pipelineId, blockId, files) {
  const formData = buildFormData(pipelineId, blockId, files);
  handleRequest(
    buildUrl("http", "localhost", "3330", "import-folder"),
    formData,
  );
}

function buildFormData(pipelineId, blockId, files) {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i]);
    formData.append("paths", files[i].webkitRelativePath);
  }

  formData.append("pipelineId", pipelineId);
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