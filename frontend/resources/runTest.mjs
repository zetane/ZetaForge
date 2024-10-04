import { spawn } from "child_process";
import fs from "fs";
import path from "path";

function runCommand(command, args, logFile) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args);

    const logStream = fs.createWriteStream(logFile, { flags: "a" });

    process.stdout.on("data", (data) => {
      const output = data.toString("utf-8");
      process.stdout.write(output);
      logStream.write(data);
    });

    process.stderr.on("data", (data) => {
      const output = data.toString("utf-8");
      process.stderr.write(output);
      logStream.write(data);
    });

    process.on("close", (code) => {
      logStream.end();
      if (code !== 0) {
        reject(
          new Error(
            `Command '${command} ${args.join(" ")}' failed with error code ${code}`,
          ),
        );
      } else {
        resolve();
      }
    });
  });
}

export async function runTestContainer(blockDir, blockKey) {
  const containerDir = "/app"; // The directory inside the container where you want to mount
  const imageName = blockKey;
  const containerName = blockKey;

  const commands = [
    ["docker", ["rm", containerName]],
    ["docker", ["rmi", imageName]],
    ["docker", ["build", "-t", imageName, blockDir]],
    [
      "docker",
      [
        "run",
        "--name",
        containerName,
        "-v",
        `${blockDir}:${containerDir}`,
        imageName,
        "python",
        "-B",
        "-c",
        "from computations import test; test()",
      ],
    ],
  ];

  const logFile = path.join(blockDir, "logs.txt");
  fs.writeFileSync(logFile, ""); // Clear the log file

  for (const [command, args] of commands) {
    console.log(`Executing: ${command} ${args.join(" ")}`);
    try {
      await runCommand(command, args, logFile);
    } catch (error) {
      console.log(`Command '${command}' failed with error`);
    }
  }
}
