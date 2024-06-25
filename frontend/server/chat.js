import fs from "fs/promises";
import path from "path";
import { fileExists, readJsonToObject } from "./fileSystem";

const CHAT_HISTORY_FILE_NAME = "chatHistory.json";
const COMPUTATIONS_FILE_NAME = "computations.py";
const START_PROMPT = "Code Template";

export async function getHistory(blockPath) {
  const chat = await getChat(blockPath);
  return chat.history;
}

export async function updateHistory(blockPath, newHistory) {
  const chatPath = path.join(blockPath, CHAT_HISTORY_FILE_NAME);
  const chat = await getChat(blockPath);
  chat.history = newHistory;
  await fs.writeFile(chatPath, JSON.stringify(chat, null, 2));
}

export async function getIndex(blockPath) {
  const chat = await getChat(blockPath);
  return chat.index;
}

export async function updateIndex(blockPath, newIndex) {
  const chatPath = path.join(blockPath, CHAT_HISTORY_FILE_NAME);
  const chat = await getChat(blockPath);
  chat.index = newIndex;
  await fs.writeFile(chatPath, JSON.stringify(chat, null, 2));
}

async function getChat(blockPath) {
  const chatPath = path.join(blockPath, CHAT_HISTORY_FILE_NAME);
  let chat = undefined;
  if (await fileExists(chatPath)) {
    chat = await readJsonToObject(chatPath);
  } else {
    chat = await createChat(blockPath);
    await fs.writeFile(chatPath, JSON.stringify(chat, null, 2));
  }
  return chat;
}

async function createChat(blockPath) {
  const codeTemplatePath = path.join(blockPath, COMPUTATIONS_FILE_NAME);
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
