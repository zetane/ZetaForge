import { describe, test, expect, vi, afterEach } from "vitest";
import {
  compileComputation,
  saveBlockSpecs,
  removeConnections,
  runTest,
  getBlockDirectory,
  filePermissionVisitor,
  getBlockFile,
  updateBlockFile,
  getLogs,
  callAgent,
} from "../../server/blockSerialization";
import fs from "fs/promises";
import path from "path";
import { fileExists, getDirectoryTree } from "../../server/fileSystem";
import { cacheJoin } from "../../server/cache";
import { app } from "electron";
import process from "process";
import { spawnAsync } from "../../server/spawnAsync";
import { getCompuationsSourceCode } from "../fixture/blockFixture";
import * as pipelineFixture from "../fixture/pipelineFixture";
import * as blockFixture from "../fixture/blockFixture";
import { ServerError } from "../../server/serverError";
import { logger } from "../../server/logger";

// Only mock external dependencies and side effects
vi.mock("fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(),
  },
}));

vi.mock("process", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    resourcesPath: path.join("/mocked", "resources"),
  };
});

vi.mock("../../server/fileSystem", () => ({
  fileExists: vi.fn(),
  getDirectoryTree: vi.fn(),
}));

vi.mock("../../server/spawnAsync", () => ({
  spawnAsync: vi.fn(),
}));

vi.mock("../../server/cache", () => ({
  cacheJoin: vi.fn(),
}));

vi.mock("../../server/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("blockSerialization", () => {
  const blockComputationsSourceCode = getCompuationsSourceCode();

  afterEach(() => {
    vi.clearAllMocks();
    vi.mocked(app).isPackaged = false;
  });

  describe("compileComputation", () => {
    test("returns code IO and description", async () => {
      const expectedSpecs = {
        description:
          "A textual description of the compute function.:in1 (all): Textual description of in1in2 (all): Textual description of in2:out1 (all): Textual description of out1out2 (all): Textual description of out2:",
        inputs: {
          in1: { type: "Any", connections: [], relays: [] },
          in2: { type: "Any", connections: [], relays: [] },
        },
        outputs: {
          out1: { type: "Any", connections: [], relays: [] },
          out2: { type: "Any", connections: [], relays: [] },
        },
      };

      vi.mocked(fs.readFile).mockResolvedValueOnce(blockComputationsSourceCode);
      vi.mocked(app).isPackaged = false;
      vi.mocked(app.getPath).mockReturnValue("");
      vi.mocked(cacheJoin).mockReturnValueOnce(
        path.join(`${pipelineFixture.getId()}`, `${blockFixture.getId()}`),
      );
      vi.mocked(cacheJoin).mockReturnValueOnce(
        path.join(
          `${pipelineFixture.getId()}`,
          `${blockFixture.getId()}/computations.py`,
        ),
      );
      vi.mocked(fileExists).mockResolvedValueOnce(true);
      vi.mocked(spawnAsync).mockResolvedValueOnce(
        JSON.stringify(expectedSpecs),
      );

      const result = await compileComputation(
        pipelineFixture.getId(),
        blockFixture.getId(),
      );

      expect(result).toHaveProperty("inputs.in1");
      expect(result).toHaveProperty("inputs.in2");
      expect(result).toHaveProperty("outputs.out1");
      expect(result).toHaveProperty("outputs.out2");
      expect(result).toHaveProperty("description", expectedSpecs.description);
    });

    test("throws error when script fails", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(blockComputationsSourceCode);
      vi.mocked(app).isPackaged = false;
      vi.mocked(fileExists).mockResolvedValueOnce(true);
      vi.mocked(spawnAsync).mockResolvedValueOnce({
        stdout: undefined,
        stderr: "something bad happened",
        status: 1,
        error: undefined,
      });

      await expect(() =>
        compileComputation(pipelineFixture.getId(), blockFixture.getId()),
      ).rejects.toThrowError();
    });

    test("throws error when script invocation fails", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(blockComputationsSourceCode);
      vi.mocked(app).isPackaged = false;
      vi.mocked(fileExists).mockResolvedValueOnce(true);
      vi.mocked(spawnAsync).mockResolvedValueOnce({
        stdout: undefined,
        stderr: undefined,
        status: undefined,
        error: {},
      });

      await expect(() =>
        compileComputation(pipelineFixture.getId(), blockFixture.getId()),
      ).rejects.toThrowError();
    });

    test("throws when script file doesn't exist", async () => {
      vi.mocked(app).isPackaged = false;
      vi.mocked(fileExists).mockResolvedValueOnce(false);

      await expect(() =>
        compileComputation(pipelineFixture.getId(), blockFixture.getId()),
      ).rejects.toThrowError("Could not find script for compilation");
    });

    test("throws when reading the file fails", async () => {
      vi.mocked(fs.readFile).mockRejectedValueOnce(
        new Error("could not read file"),
      );
      await expect(() =>
        compileComputation(pipelineFixture.getId(), blockFixture.getId()),
      ).rejects.toThrowError();
    });
  });

  describe("saveBlockSpecs", () => {
    test("should save block specs successfully", async () => {
      const specs = { inputs: {}, outputs: {}, views: { node: {} } };
      await saveBlockSpecs("/pipeline", "block1", specs);
      expect(vi.mocked(fs.writeFile)).toHaveBeenCalledWith(
        path.join("/pipeline", "block1", "specs.json"),
        JSON.stringify(
          { inputs: {}, outputs: {}, views: { node: { pos_x: 0, pos_y: 0 } } },
          null,
          2,
        ),
      );
    });

    test("should handle errors during file write", async () => {
      vi.mocked(fs.writeFile).mockRejectedValueOnce(
        new Error("File write error"),
      );
      const specs = { inputs: {}, outputs: {}, views: { node: {} } };
      await expect(
        saveBlockSpecs("/pipeline", "block1", specs),
      ).rejects.toThrowError(ServerError);
      expect(vi.mocked(logger.error)).toHaveBeenCalled();
    });
  });

  describe("removeConnections", () => {
    test("should remove connections from inputs and outputs", () => {
      const io = {
        in1: { connections: [1, 2] },
        out1: { connections: [3, 4] },
      };
      const result = removeConnections(io);
      expect(result.in1.connections).toEqual([]);
      expect(result.out1.connections).toEqual([]);
    });
  });

  describe("runTest", () => {
    test("should run tests successfully", async () => {
      vi.mocked(fileExists).mockResolvedValueOnce(true);
      vi.mocked(spawnAsync).mockResolvedValueOnce("");

      await runTest("/pipeline", "block1");
      expect(vi.mocked(fileExists)).toHaveBeenCalledWith(
        path.join("resources", "run_test.py"),
      );
      expect(vi.mocked(spawnAsync)).toHaveBeenCalledWith("python", [
        path.join("resources", "run_test.py"),
        path.join("/pipeline", "block1"),
        "block1",
      ]);
    });

    test("should throw ServerError if test script not found", async () => {
      vi.mocked(fileExists).mockResolvedValueOnce(false);
      await expect(runTest("/pipeline", "block1")).rejects.toThrowError(
        ServerError,
      );
      expect(vi.mocked(logger.error)).toHaveBeenCalled();
    });
  });

  describe("getBlockDirectory", () => {
    test("should get block directory successfully", async () => {
      const tree = { name: "block1", children: [] };
      vi.mocked(getDirectoryTree).mockResolvedValueOnce(tree);
      const result = await getBlockDirectory("/pipeline", "block1");
      expect(result).toEqual(tree);
      expect(vi.mocked(getDirectoryTree)).toHaveBeenCalledWith(
        path.join("/pipeline", "block1"),
        filePermissionVisitor,
      );
    });

    test("should throw ServerError if getDirectoryTree fails", async () => {
      vi.mocked(getDirectoryTree).mockRejectedValueOnce(
        new Error("Directory error"),
      );
      await expect(
        getBlockDirectory("/pipeline", "block1"),
      ).rejects.toThrowError(ServerError);
      expect(vi.mocked(logger.error)).toHaveBeenCalled();
    });
  });

  // Simple utility functions don't need complex mocking
  describe("filePermissionVisitor", () => {
    test("should return read and write true for directories", () => {
      const result = filePermissionVisitor("dir", "/path/to/dir", "dir", true);
      expect(result).toEqual({ read: true, write: true });
    });

    test("should handle files correctly", () => {
      const result = filePermissionVisitor(
        "test.py",
        path.join("/path", "to", "test.py"),
        "test.py",
        false,
      );
      // Test actual result based on your file permission rules
      expect(result.read).toBeDefined();
      expect(result.write).toBeDefined();
    });
  });

  describe("getBlockFile", () => {
    test("should get block file content successfully", async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce("file content");
      const result = await getBlockFile("/pipeline", "block1", "file.txt");
      expect(result).toBe("file content");
    });

    test("should handle errors during file read", async () => {
      vi.mocked(fs.readFile).mockRejectedValueOnce(
        new Error("File read error"),
      );
      await expect(
        getBlockFile("/pipeline", "block1", "file.txt"),
      ).rejects.toThrowError(ServerError);
      expect(vi.mocked(logger.error)).toHaveBeenCalled();
    });
  });

  describe("updateBlockFile", () => {
    test("should update block file content successfully", async () => {
      await updateBlockFile("/pipeline", "block1", "file.txt", "new content");
      expect(vi.mocked(fs.writeFile)).toHaveBeenCalledWith(
        path.join("/pipeline", "block1", "file.txt"),
        "new content",
      );
    });

    test("should handle errors during file write", async () => {
      vi.mocked(fs.writeFile).mockRejectedValueOnce(
        new Error("File write error"),
      );
      await expect(
        updateBlockFile("/pipeline", "block1", "file.txt", "new content"),
      ).rejects.toThrowError(ServerError);
      expect(vi.mocked(logger.error)).toHaveBeenCalled();
    });
  });

  describe("getLogs", () => {
    test("should get logs successfully", async () => {
      vi.mocked(fileExists).mockResolvedValueOnce(true);
      vi.mocked(fs.readFile).mockResolvedValueOnce("log content");
      const result = await getLogs("/pipeline", "block1");
      expect(result).toBe("log content");
    });

    test("should return 'Logs not yet available' if logs file does not exist", async () => {
      vi.mocked(fileExists).mockResolvedValueOnce(false);
      const result = await getLogs("/pipeline", "block1");
      expect(result).toBe("Logs not yet available");
      expect(vi.mocked(fs.readFile)).not.toHaveBeenCalled();
    });

    test("should handle errors during file read", async () => {
      vi.mocked(fileExists).mockResolvedValueOnce(true);
      vi.mocked(fs.readFile).mockRejectedValueOnce(
        new Error("File read error"),
      );
      await expect(getLogs("/pipeline", "block1")).rejects.toThrowError(
        ServerError,
      );
      expect(vi.mocked(logger.error)).toHaveBeenCalled();
    });
  });
});

describe("callAgent", () => {
  test("should call agent successfully and return response", async () => {
    vi.mocked(spawnAsync).mockResolvedValueOnce(
      JSON.stringify({ response: "Agent response" }),
    );
    const result = await callAgent("user message", "testAgent", [], "api-key");
    expect(result).toBe("Agent response");
    expect(vi.mocked(spawnAsync)).toHaveBeenCalledWith(
      "python",
      [path.join("agents", "testAgent", "generate", "computations.py")],
      {
        input: JSON.stringify({
          apiKey: "api-key",
          userMessage: "user message",
          conversationHistory: [],
        }),
        encoding: "utf8",
      },
    );
  });

  test("should handle packaged app path correctly", async () => {
    vi.mocked(app).isPackaged = true;
    vi.mocked(process).resourcesPath = path.join("/mocked", "resources");
    vi.mocked(spawnAsync).mockResolvedValueOnce(
      JSON.stringify({ response: "Agent response" }),
    );
    await callAgent("user message", "testAgent", [], "api-key");
    expect(vi.mocked(spawnAsync)).toHaveBeenCalledWith(
      "python",
      [
        path.join(
          "/mocked",
          "resources",
          "agents",
          "testAgent",
          "generate",
          "computations.py",
        ),
      ],
      {
        input: JSON.stringify({
          apiKey: "api-key",
          userMessage: "user message",
          conversationHistory: [],
        }),
        encoding: "utf8",
      },
    );
  });

  test("should throw ServerError if spawnAsync fails", async () => {
    vi.mocked(spawnAsync).mockRejectedValueOnce(new Error("Spawn error"));
    await expect(
      callAgent("user message", "testAgent", [], "api-key"),
    ).rejects.toThrowError(ServerError);
    expect(vi.mocked(logger.error)).toHaveBeenCalled();
  });

  test("should throw ServerError if agent returns an error", async () => {
    vi.mocked(spawnAsync).mockResolvedValueOnce(
      JSON.stringify({ error: { message: "Agent error", status_code: 400 } }),
    );
    await expect(
      callAgent("user message", "testAgent", [], "api-key"),
    ).rejects.toThrowError(ServerError);
    expect(vi.mocked(logger.error)).toHaveBeenCalled(); // ServerError is thrown directly
  });

  test("should throw ServerError for non-ServerError from agent", async () => {
    vi.mocked(spawnAsync).mockResolvedValueOnce(
      JSON.stringify({ error: "some string error" }),
    );
    await expect(
      callAgent("user message", "testAgent", [], "api-key"),
    ).rejects.toThrowError(ServerError);
    expect(vi.mocked(logger.error)).toHaveBeenCalled();
  });

  test("should throw ServerError if response is not valid JSON", async () => {
    vi.mocked(spawnAsync).mockResolvedValueOnce("invalid json");
    await expect(
      callAgent("user message", "testAgent", [], "api-key"),
    ).rejects.toThrowError(ServerError);
    expect(vi.mocked(logger.error)).toHaveBeenCalled();
  });
});
