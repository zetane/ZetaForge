import { atom } from "jotai";

function stripAnsiCodes(str) {
  return str.replace(/\u001b\[[0-9;]*[mGK]/g, "");
}

export function parseLogLine(line) {
  const logRegex =
    /time="(?<time>[^"]+)"\s+(?:(?:level=(?<level>\w+)|error="(?<error>[^"]+)"|argo=(?<argo>[^\s]+)|\s+)\s*){0,3}msg="(?<msg>[^"]+)"(.*)$/;

  const { executionId, time, message, blockId, ...otherFields } =
    JSON.parse(line);
  const strippedMessage = stripAnsiCodes(message);

  const regexMatch = strippedMessage.match(logRegex);
  let argo = {};
  if (regexMatch) {
    const {
      time: argoTime,
      level,
      error,
      argo: argoId,
      msg,
    } = regexMatch.groups;
    argo = {
      time: argoTime,
      level,
      error,
      argoId,
      msg,
    };
  }

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
  const event = { tag: tag, data: data };
  return {
    executionId,
    blockId,
    message,
    event,
    time,
    argo,
    ...otherFields,
  };
}

export const logsAtom = atom(new Map());
