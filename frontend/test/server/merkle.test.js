import { describe, test, expect, vi, afterEach, beforeEach } from "vitest";
import * as pipelineFixture from "../fixture/pipelineFixture";
import * as blockFixture from "../fixture/blockFixture";
import { getPipelineMerkleTree } from "../../server/merkle";
import mockFs from "mock-fs";
import crypto from "crypto";

const digestMock = vi.fn();
vi.mock("crypto", () => ({
  default: {
    createHash: vi.fn(),
  },
}));

describe("merkle", () => {
  beforeEach(() => {
    crypto.createHash.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: digestMock,
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
            A: "1",
            B: "2",
            C: {
              D: "4",
              E: "5",
            },
          },
        },
      });
      const specs = pipelineFixture.getSpecs();
      digestMock.mockReturnValue("hash");

      const result = await getPipelineMerkleTree(
        specs,
        pipelineFixture.getId(),
      );

      const expected = {
        hash: "hash",
        [blockFixture.getId()]: {
          hash: "hash",
          files: {
            path: "",
            hash: "hash",
            children: [
              {
                path: "A",
                hash: "hash",
              },
              {
                path: "B",
                hash: "hash",
              },
              {
                path: "C",
                hash: "hash",
                children: [
                  {
                    path: "C/D",
                    hash: "hash",
                  },
                  {
                    path: "C/E",
                    hash: "hash",
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
      const specs = pipelineFixture.getSpecs();
      specs.pipeline = {};
      const blockIds = ["block-1", "block-2", "block-3"];
      const fs = {
        [specs.id]: {},
      };
      for (let blockId of blockIds) {
        const block = blockFixture.getSpecs();
        block.information.id = blockId;
        specs.pipeline[blockId] = block;
        fs[specs.id][blockId] = { file: "content" };
      }
      mockFs(fs);
      digestMock.mockReturnValue("hash");

      const result = await getPipelineMerkleTree(specs, specs.id);

      const expected = {
        hash: "hash",
        [blockIds[0]]: {
          hash: "hash",
          files: {
            path: "",
            hash: "hash",
            children: [
              {
                path: "file",
                hash: "hash",
              },
            ],
          },
        },
        [blockIds[1]]: {
          hash: "hash",
          files: {
            path: "",
            hash: "hash",
            children: [
              {
                path: "file",
                hash: "hash",
              },
            ],
          },
        },
        [blockIds[2]]: {
          hash: "hash",
          files: {
            path: "",
            hash: "hash",
            children: [
              {
                path: "file",
                hash: "hash",
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
      mockFs({
        [specs.id]: {
          [blockIds[2]]: {
            file: "content",
          },
        },
      });
      let parentBlock = specs;
      for (let blockId of blockIds) {
        const block = blockFixture.getSpecs();
        block.information.id = blockId;
        parentBlock.container = undefined;
        parentBlock.pipeline = {
          [blockId]: block,
        };
        parentBlock = block.action;
      }
      digestMock.mockReturnValue("hash");

      const result = await getPipelineMerkleTree(specs, specs.id);

      const expected = {
        hash: "hash",
        [blockIds[0]]: {
          hash: "hash",
          [blockIds[1]]: {
            hash: "hash",
            [blockIds[2]]: {
              hash: "hash",
              files: {
                path: "",
                hash: "hash",
                children: [
                  {
                    path: "file",
                    hash: "hash",
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
      digestMock.mockReturnValue("hash");

      const result = await getPipelineMerkleTree(specs, specs.id);

      const expected = {
        hash: "hash",
        [block.information.id]: {
          hash: null,
          files: {
            path: "",
            hash: null,
            children: [],
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
      digestMock.mockReturnValue("hash");

      const result = await getPipelineMerkleTree(specs, specs.id);

      const expected = {
        hash: null,
      };
      expect(result).toEqual(expected);
    });
  });
});
