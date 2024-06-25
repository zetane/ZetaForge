import pino from "pino";
import config from "../config";
import pinoCaller from "pino-caller";
import process from "process";

const pinoBase = pino({
  level: config.logLevel,
  transport: {
    target: "pino-pretty",
  },
});

export const logger = pinoCaller(pinoBase, {relativeTo: process.cwd()})
