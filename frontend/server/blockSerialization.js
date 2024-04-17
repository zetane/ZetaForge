import { spawnSync } from "child_process";
import { app } from "electron";
import fs from "fs/promises";
import path from "path";
import { fileExists } from "./fileSystem";

export async function compileComputation(blockPath) {
  const sourcePath = path.join(blockPath, "computations.py")
  const source = await fs.readFile(sourcePath, { encoding: 'utf8' })

  const scriptPath = app.isPackaged? path.join(process.resourcesPath, "resources", "compileComputation.py") : path.join("resources", "compileComputation.py");
  if (!(await fileExists(scriptPath))) {
    throw new Error(`Could not find script for compilation: ${scriptPath}`);
  }

  const {stdout} = spawnSync("python", [scriptPath], {
    input: source,
    encoding: 'utf8'
  });
  const io = JSON.parse(stdout);
  return io;
}

export async function saveBlockSpecs(blockPath, specs) {
  const specsPath = path.join(blockPath, "specs_v1.json");

  removeConnections(specs.inputs)
  removeConnections(specs.outputs)

  specs.views.node.pos_x = 0
  specs.views.node.pos_y = 0

  await fs.writeFile(specsPath, JSON.stringify(specs, null, 2))
}

function removeConnections(io) {
  for (const key in io){
    io[key].connections = [];
  }
  
  return io;
}