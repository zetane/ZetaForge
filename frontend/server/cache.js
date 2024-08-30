import { app } from "electron";
import path from "path";

export const absoluteCachePath = path.join(
  app.getPath("appData"),
  "zetaforge",
  ".cache",
);

export function cacheJoin(...segments) {
  return path.join(absoluteCachePath, ...segments);
}
