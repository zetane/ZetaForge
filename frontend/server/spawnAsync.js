import { spawn } from "child_process";

export function spawnAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const process = spawn(command, args, options);

    process.stdout.setEncoding(options?.encoding);
    process.stdout.on("data", (data) => {
      stdout += data;
    });

    process.stderr.setEncoding(options?.encoding);
    process.stderr.on("data", (data) => {
      stderr += data;
    });

    process.on("exit", (status) => {
      if (status != 0) {
        const message = `Process exited unsuccessfully with code ${status} and error: ${stderr}`;
        reject(new Error(message));
      }
      resolve(stdout);
    });

    process.on("error", (error) => {
      const message = `Process returned errors: ${error}`;
      reject(new Error(message));
    });

    if (options?.input) {
      process.stdin.write(options.input);
    }
    process.stdin.end();
  });
}
