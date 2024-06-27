import pino from "pino";
import config from "../config";
import pinoCaller from "pino-caller";
import process from "process";

let configuredLogger;
if (config.logger.pretty.toLowerCase() === "true") {
  configuredLogger = pinoCaller(
    pino({
      level: config.logger.level,
      transport: {
        target: "pino-pretty",
      },
    }),
    {
      relativeTo: process.cwd(),
    },
  );
} else {
  configuredLogger = pino({
    level: config.logger.level,
  });
}

export const logger = configuredLogger;
