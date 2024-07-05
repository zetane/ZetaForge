import { atom } from "jotai";

export interface ParsedLogEntry {
  executionId: string;
  blockId?: string;
  message: string;
  tag?: string;
  data?: any;
  time: string;
  [key: string]: any;
}

function stripAnsiCodes(str: string) {
  return str.replace(/\u001b\[[0-9;]*[mGK]/g, "");
}

export function parseLogLine(line: string): ParsedLogEntry | null {
  const { executionId, time, message, blockId, ...otherFields } =
    JSON.parse(line);
  const strippedMessage = stripAnsiCodes(message);

  // Split the message on |||
  const [tag, dataString] = strippedMessage.split("|||").map((s) => s.trim());

  // Parse the data string if it exists and is valid JSON
  let data = {};
  if (dataString) {
    try {
      data = JSON.parse(JSON.stringify(dataString));
    } catch (e) {
      console.warn("Failed to parse data string:", dataString);
      data = { rawData: dataString };
    }
  }
  return {
    executionId,
    blockId,
    message,
    tag,
    data,
    time,
    ...otherFields,
  };
}

export const logsAtom = atom(new Map());
