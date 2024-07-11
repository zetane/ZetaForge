import { atom } from "jotai";

function stripAnsiCodes(str) {
  return str.replace(/\u001b\[[0-9;]*[mGK]/g, "");
}

export function parseLogLine(line) {
  const { executionId, time, message, blockId, ...otherFields } =
    JSON.parse(line);
  const strippedMessage = stripAnsiCodes(message);

  const logRegex =
    /time="(?<time>[^"]+)"\s+level=(?<level>\w+)\s+msg="(?<msg>[^"]+)"(?:\s+argo=(?<argo>[^\s]+))?(?:\s+error="(?<error>[^"]+)")?/;
  const regexMatch = strippedMessage.match(logRegex);

  let argoLog = {};
  if (regexMatch) {
    const { time, level, msg, argo, error } = regexMatch.groups;
    argoLog = {
      time,
      level,
      msg,
      argo,
      error,
    };
  }

  // Split the message on |||
  const [tag, dataString] = strippedMessage.split("|||").map((s) => s.trim());

  // Parse the data string if it exists and is valid JSON
  let data = {};
  let event = {};
  if (dataString) {
    try {
      data = JSON.parse(JSON.stringify(dataString));
    } catch (e) {
      console.warn("Failed to parse data string:", dataString);
      data = { rawData: dataString };
    }
    event = { tag: tag, data: data };
  }
  return {
    executionId,
    blockId,
    message,
    event,
    time,
    argoLog,
    ...otherFields,
  };
}

export const logsAtom = atom(new Map());
