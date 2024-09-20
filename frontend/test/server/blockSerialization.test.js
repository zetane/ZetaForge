import { describe, test, expect, vi, afterEach } from "vitest";
import { compileComputation } from "../../server/blockSerialization";
import fs from "fs/promises";
import { fileExists } from "../../server/fileSystem";
import { cacheJoin } from "../../server/cache";
import { app } from "electron";
import { spawnAsync } from "../../server/spawnAsync";
import { getCompuationsSourceCode } from "../fixture/blockFixture";
import * as pipelineFixture from "../fixture/pipelineFixture";
import * as blockFixture from "../fixture/blockFixture";

vi.mock("fs/promises", () => ({
  default: {
    readFile: vi.fn(),
  },
}));

vi.mock("electron", () => ({
  app: {
    isPackaged: vi.fn(),
    getPath: vi.fn(),
  },
}));

vi.mock("../../server/fileSystem", () => ({
  fileExists: vi.fn(),
}));

vi.mock("../../server/spawnAsync", () => ({
  spawnAsync: vi.fn(),
}));

vi.mock("../../server/cache", () => ({
  cacheJoin: vi.fn(),
}));

describe("", () => {
  const blockComputationsSourceCode = getCompuationsSourceCode();

  afterEach(() => {
    vi.clearAllMocks();
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

      fs.readFile.mockResolvedValueOnce(blockComputationsSourceCode);
      app.isPackaged = false;
      app.getPath.mockReturnValue("");
      cacheJoin.mockReturnValue(
        `${pipelineFixture.getId()}/${blockFixture.getId()}`,
      );
      cacheJoin.mockReturnValue(
        `${pipelineFixture.getId()}/${blockFixture.getId()}/computations.py`,
      );
      fileExists.mockResolvedValueOnce(true);
      spawnAsync.mockReturnValueOnce(JSON.stringify(expectedSpecs));

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
      fs.readFile.mockResolvedValueOnce(blockComputationsSourceCode);
      app.isPackaged = false;
      fileExists.mockResolvedValueOnce(true);
      spawnAsync.mockReturnValueOnce({
        stdout: undefined,
        stderr: "something bad happened",
        status: 1,
        error: undefined,
      });

      expect(() =>
        compileComputation(pipelineFixture.getId(), blockFixture.getId()),
      ).rejects.toThrowError();
    });

    test("throws error when script invocation fails", async () => {
      fs.readFile.mockResolvedValueOnce(blockComputationsSourceCode);
      app.isPackaged = false;
      fileExists.mockResolvedValueOnce(true);
      spawnAsync.mockReturnValueOnce({
        stdout: undefined,
        stderr: undefined,
        status: undefined,
        error: {},
      });

      expect(() =>
        compileComputation(pipelineFixture.getId(), blockFixture.getId()),
      ).rejects.toThrowError();
    });

    test("throws when script file doesn't exist", async () => {
      const scriptStdout = "";

      app.isPackaged = false;
      fileExists.mockResolvedValueOnce(false);
      spawnAsync.mockReturnValueOnce({ stdout: scriptStdout });

      expect(() =>
        compileComputation(pipelineFixture.getId(), blockFixture.getId()),
      ).rejects.toThrowError("Could not find script for compilation");
    });

    test("throws when reading the file fails", () => {
      fs.readFile.mockRejectedValueOnce(new Error("could not read file"));
      expect(() =>
        compileComputation(pipelineFixture.getId(), blockFixture.getId()),
      ).rejects.toThrowError();
    });
  });
});
