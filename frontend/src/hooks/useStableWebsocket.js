import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { useState, useRef } from "react";
import useWebSocket from "react-use-websocket";
import { useAtom } from "jotai";

const WebSocketCloseCodes = {
  1000: "Normal Closure",
  1001: "Going Away",
  1002: "Protocol Error",
  1003: "Unsupported Data",
  1008: "Policy Violation",
  1011: "Internal Server Error",
  4004: "Room Not Found",
};

export const useStableWebSocket = (url) => {
  const [wsError, setWsError] = useState(null);
  const reconnectCount = useRef(0);
  const [configuration] = useAtom(activeConfigurationAtom);
  const protocols = url?.startsWith("wss") ? [configuration.anvil.token] : null;

  const { lastMessage, readyState, sendMessage } = useWebSocket(url, {
    shouldReconnect: (closeEvent) => {
      const shouldReconnect =
        closeEvent.code !== 1000 &&
        closeEvent.code !== 4004 &&
        reconnectCount.current < 5;
      if (shouldReconnect) {
        reconnectCount.current += 1;
      }
      if (!shouldReconnect) {
        setWsError(WebSocketCloseCodes[closeEvent.code] || "WebSocket closed");
      }
      return shouldReconnect;
    },
    protocols: protocols,
    reconnectInterval: (attemptNumber) => Math.min(1000 * 2, 30000),
    onOpen: (event) => {
      console.log("Open: ", event);
      console.log("WebSocket connection established.");
      setWsError(null);
      reconnectCount.current = 0;
    },
    onError: (event) => {
      console.error("WebSocket error:", event);
      setWsError("WebSocket connection error. Please check your connection.");
    },
    onClose: (event) => {
      console.log(
        `WebSocket closed with code ${event.code}: ${WebSocketCloseCodes[event.code] || "Unknown"}`,
      );
      if (event.reason) {
        console.log("Close reason:", event.reason);
      }
      if (event.code === 4004) {
        setWsError(
          "The requested room does not exist. The pipeline may have completed or been terminated.",
        );
      } else if (event.code !== 1000) {
        setWsError(
          `WebSocket closed: ${WebSocketCloseCodes[event.code] || "Unknown reason"}`,
        );
      }
    },
  });

  return { lastMessage, readyState, wsError, sendMessage };
};
