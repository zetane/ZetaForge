import pino from "pino";
import config from "../config";
import pinoCaller from "pino-caller";
import process from "process";
import { app as electronApp } from "electron";
import path from "path";
import fs from "fs";

let configuredLogger;
try {
  // Determine the log file path
  const logFilePath = electronApp.isPackaged
    ? path.join(process.resourcesPath, "logs")
    : path.join(process.cwd(), "logs");

  fs.mkdirSync(path.dirname(logFilePath), { recursive: true });

  if (config.logger.pretty.toLowerCase() === "true") {
    configuredLogger = pinoCaller(
      pino({
        level: config.logger.level,
        transport: {
          targets: [
            { target: "pino-pretty" }, // Pretty print to console
            {
              target: "pino/file",
              options: { destination: path.join(logFilePath, "app.log") },
            }, // Log to file
          ],
        },
      }),
    );
  } else {
    configuredLogger = pinoCaller(
      pino({
        level: config.logger.level,
        transport: {
          targets: [
            {
              target: "pino/file",
              options: { destination: path.join(logFilePath, "app.log") },
            },
            { target: "pino-pretty" },
          ],
        },
      }),
    );
  }
  pino.destination(path.join(logFilePath, "app2.log"));

  // Override console.log to use Pino
  if (electronApp.isPackaged) {
    console.log = (...args) => {
      configuredLogger.info(...args);
    };
    console.error = (...args) => {
      configuredLogger.error(...args);
    };
  }
} catch (err) {
  console.log(err);

  configuredLogger = pinoCaller(
    pino({
      level: config.logger.level,
      transport: {
        target: "pino-pretty",
      },
    }),
  );
}
export const logger = configuredLogger;
