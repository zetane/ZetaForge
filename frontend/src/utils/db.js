import Dexie from "dexie";

// Define the database
export const db = new Dexie("AppWorkspace");
db.version(1).stores({
  workspace: "id",
});
