import fs from "fs/promises";
import { fileExists, readJsonToObject } from "./fileSystem";
import z from "zod";
import { cacheJoin } from "./cache";

const CHAT_HISTORY_FILE_NAME = "chatHistory.json";
const COMPUTATIONS_FILE_NAME = "computations.py";
const START_PROMPT = "Code Template";

const schema = z.object({
  index: z.number(),
  history: z.array(
    z.object({
      timestamp: z.number(),
      prompt: z.string(),
      response: z.string(),
    }),
  ),
});

const legacySchema = z.array(
  z.object({
    timestamp: z.number(),
    prompt: z.string(),
    response: z.string(),
  }),
);

export async function getHistory(pipelineId, blockId) {
  const chatPath = cacheJoin(pipelineId, blockId, CHAT_HISTORY_FILE_NAME);
  const codeTemplatePath = cacheJoin(
    pipelineId,
    blockId,
    COMPUTATIONS_FILE_NAME,
  );
  const chat = await getChat(chatPath, codeTemplatePath);
  return chat.history;
}

export async function updateHistory(pipelineId, blockId, newHistory) {
  const chatPath = cacheJoin(pipelineId, blockId, CHAT_HISTORY_FILE_NAME);
  const codeTemplatePath = cacheJoin(
    pipelineId,
    blockId,
    COMPUTATIONS_FILE_NAME,
  );
  const chat = await getChat(chatPath, codeTemplatePath);
  chat.history = newHistory;
  await fs.writeFile(chatPath, JSON.stringify(chat, null, 2));
}

export async function getIndex(pipelineId, blockId) {
  const chatPath = cacheJoin(pipelineId, blockId, CHAT_HISTORY_FILE_NAME);
  const codeTemplatePath = cacheJoin(
    pipelineId,
    blockId,
    COMPUTATIONS_FILE_NAME,
  );
  const chat = await getChat(chatPath, codeTemplatePath);
  return chat.index;
}

export async function updateIndex(pipelineId, blockId, newIndex) {
  const chatPath = cacheJoin(pipelineId, blockId, CHAT_HISTORY_FILE_NAME);
  const codeTemplatePath = cacheJoin(
    pipelineId,
    blockId,
    COMPUTATIONS_FILE_NAME,
  );
  const chat = await getChat(chatPath, codeTemplatePath);
  chat.index = newIndex;
  await fs.writeFile(chatPath, JSON.stringify(chat, null, 2));
}

async function getChat(chatPath, codeTemplatePath) {
  if (!(await fileExists(chatPath))) {
    const chat = await createDefaultChat(codeTemplatePath);
    await fs.writeFile(chatPath, JSON.stringify(chat, null, 2));
    return chat;
  }

  let fileContent;
  try {
    fileContent = await readJsonToObject(chatPath);
  } catch {
    const chat = await createDefaultChat(codeTemplatePath);
    await fs.writeFile(chatPath, JSON.stringify(chat, null, 2));
    return chat;
  }

  const result = schema.safeParse(fileContent);
  if (!result.success) {
    const chat = await handleInvalidSchema(codeTemplatePath);
    await fs.writeFile(chatPath, JSON.stringify(chat, null, 2));
    return chat;
  }

  return result.data;
}

async function handleInvalidSchema(fileContent, codeTemplatePath) {
  const result = legacySchema.safeParse(fileContent);
  if (result.success) {
    return await upgradeChatHistory(fileContent, codeTemplatePath);
  }

  return await createDefaultChat(codeTemplatePath);
}

async function createDefaultChat(codeTemplatePath) {
  const codeTemplate = await fs.readFile(codeTemplatePath, "utf8");
  const chatHistory = {
    index: 0,
    history: [
      {
        timestamp: Date.now(),
        prompt: START_PROMPT,
        response: codeTemplate,
      },
    ],
  };
  return chatHistory;
}

async function upgradeChatHistory(history, codeTemplatePath) {
  const currentCode = await fs.readFile(codeTemplatePath, "utf8");

  let codeIndex = -1;
  for (let [index, value] of history.entries()) {
    if (value.response == currentCode) {
      codeIndex = index;
    }
  }

  if (codeIndex === -1) {
    history = [
      ...history,
      {
        timestamp: Date.now(),
        prompt: START_PROMPT,
        response: currentCode,
      },
    ];
    codeIndex = history.length - 1;
  }

  const chatHistory = {
    index: codeIndex,
    history: history,
  };
  return chatHistory;
}
