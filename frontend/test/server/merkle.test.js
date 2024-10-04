import { describe, test, expect, vi, afterEach, beforeEach } from "vitest";
import * as pipelineFixture from "../fixture/pipelineFixture";
import * as blockFixture from "../fixture/blockFixture";
import { computePipelineMerkleTree } from "../../server/merkle";
import mockFs from "mock-fs";
import crypto from "crypto";

vi.mock("crypto", () => ({
  default: {
    createHash: vi.fn(),
  },
}));

describe("merkle", () => {
  beforeEach(() => {
    crypto.createHash.mockImplementation(() => {
      let value = 0;

      function update(v) {
        value = v;
        return this;
      }

      function digest() {
        return value + ".";
      }

      return {
        update,
        digest,
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockFs.restore();
  });

  describe("getPipelineMerkleTree", () => {
    test("single block", async () => {
      mockFs({
        [pipelineFixture.getId()]: {
          [blockFixture.getId()]: {
            A: "A",
            B: "B",
            C: {
              D: "D",
              E: "E",
            },
          },
        },
      });
      const specs = pipelineFixture.getSpecs();

      const result = await computePipelineMerkleTree(
        specs,
        pipelineFixture.getId(),
      );

      const expected = {
        hash: "A.B.D.E...",
        [blockFixture.getId()]: {
          hash: "A.B.D.E...",
          files: {
            path: "",
            hash: "A.B.D.E...",
            children: [
              {
                path: "A",
                hash: "A.",
              },
              {
                path: "B",
                hash: "B.",
              },
              {
                path: "C",
                hash: "D.E..",
                children: [
                  {
                    path: "C/D",
                    hash: "D.",
                  },
                  {
                    path: "C/E",
                    hash: "E.",
                  },
                ],
              },
            ],
          },
        },
      };
      expect(result).toEqual(expected);
    });

    test("multiple blocks", async () => {
      const blockIds = ["block-1", "block-2", "block-3"];
      const blocks = [];
      for (let blockId of blockIds) {
        const block = blockFixture.getSpecs();
        block.information.id = blockId;
        blocks.push(block);
      }
      const specs = pipelineFixture.getSpecs();
      const fs = {
        [specs.id]: {
          [blockIds[0]]: { file: "A" },
          [blockIds[1]]: { file: "B" },
          [blockIds[2]]: { file: "C" },
        },
      };
      specs.pipeline = {
        [blockIds[0]]: blocks[0],
        [blockIds[1]]: blocks[1],
        [blockIds[2]]: blocks[2],
      };
      mockFs(fs);

      const result = await computePipelineMerkleTree(specs, specs.id);

      const expected = {
        hash: "A.B.C..",
        [blockIds[0]]: {
          hash: "A.",
          files: {
            path: "",
            hash: "A.",
            children: [
              {
                path: "file",
                hash: "A.",
              },
            ],
          },
        },
        [blockIds[1]]: {
          hash: "B.",
          files: {
            path: "",
            hash: "B.",
            children: [
              {
                path: "file",
                hash: "B.",
              },
            ],
          },
        },
        [blockIds[2]]: {
          hash: "C.",
          files: {
            path: "",
            hash: "C.",
            children: [
              {
                path: "file",
                hash: "C.",
              },
            ],
          },
        },
      };
      expect(result).toEqual(expected);
    });

    test("nested pipeline", async () => {
      const specs = pipelineFixture.getSpecs();
      const blockIds = ["block-1", "block-2", "block-3"];
      const blocks = [];
      for (let blockId of blockIds) {
        const block = blockFixture.getSpecs();
        block.information.id = blockId;
        delete block.action.container;
        blocks.push(block);
      }
      mockFs({
        [specs.id]: {
          [blockIds[2]]: {
            file: "A",
          },
        },
      });
      specs.pipeline = {
        [[blockIds[0]]]: {
          ...blocks[0],
          action: {
            pipeline: {
              [blockIds[1]]: {
                ...blocks[1],
                action: {
                  pipeline: {
                    [blockIds[2]]: {
                      ...blocks[2],
                      container: blockFixture.getSpecs().action.container
                    },
                  },
                },
              },
            },
          },
        },
      };
      let parentBlock = specs;
      for (let blockId of blockIds) {
        const block = blockFixture.getSpecs();
        block.information.id = blockId;
        delete parentBlock.container;
        parentBlock.pipeline = {
          [blockId]: block,
        };
        parentBlock = block.action;
      }

      const result = await computePipelineMerkleTree(specs, specs.id);

      const expected = {
        hash: "A.",
        [blockIds[0]]: {
          hash: "A.",
          [blockIds[1]]: {
            hash: "A.",
            [blockIds[2]]: {
              hash: "A.",
              files: {
                path: "",
                hash: "A.",
                children: [
                  {
                    path: "file",
                    hash: "A.",
                  },
                ],
              },
            },
          },
        },
      };
      expect(result).toEqual(expected);
    });

    test("empty block directory", async () => {
      const specs = pipelineFixture.getSpecs();
      const block = blockFixture.getSpecs();
      mockFs({
        [specs.id]: {
          [block.information.id]: {},
        },
      });

      const result = await computePipelineMerkleTree(specs, specs.id);

      const expected = {
        hash: ".",
        [block.information.id]: {
          hash: ".",
          files: {
            path: "",
            hash: ".",
            children: [],
          },
        },
      };
      expect(result).toEqual(expected);
    });

    test("empty directory in block", async () => {
      const specs = pipelineFixture.getSpecs();
      const block = blockFixture.getSpecs();
      mockFs({
        [specs.id]: {
          [block.information.id]: {
            A: {},
          },
        },
      });

      const result = await computePipelineMerkleTree(specs, specs.id);

      const expected = {
        hash: ".",
        [block.information.id]: {
          hash: ".",
          files: {
            path: "",
            hash: ".",
            children: [
              {
                path: "A",
                hash: ".",
                children: [],
              },
            ],
          },
        },
      };
      expect(result).toEqual(expected);
    });

    test("empty pipeline", async () => {
      const specs = pipelineFixture.getSpecs();
      specs.pipeline = {};
      mockFs({
        [specs.id]: {},
      });

      const result = await computePipelineMerkleTree(specs, specs.id);

      const expected = {
        hash: ".",
      };
      expect(result).toEqual(expected);
    });
  });
});
