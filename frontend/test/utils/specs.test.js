import { describe, test, expect, vi } from "vitest";
import * as blockFixture from "../fixture/blockFixture";
import * as pipelineFixture from "../fixture/pipelineFixture";
import { updateSpecs } from "@/utils/specs";
import * as connectionFixture from "../fixture/connectionFixture";

describe("specs", () => {
  describe("upadteSpecs", () => {
    const editorMock = {
      removeNodeOutputConnections: vi.fn(),
      removeNodeInputConnections: vi.fn(),
    };

    test("dont update when IOs are the same", async () => {
      const pipelineSpecs = pipelineFixture.getSpecs().pipeline;
      const blockId = blockFixture.getId();
      const io = blockFixture.getCompilationIO();
      io.inputs.in1.type = pipelineSpecs[blockId].inputs.in1.type;
      io.inputs.in2.type = pipelineSpecs[blockId].inputs.in2.type;
      io.outputs.out1.type = pipelineSpecs[blockId].outputs.out1.type;
      io.outputs.out2.type = pipelineSpecs[blockId].outputs.out2.type;
      io.description = pipelineSpecs[blockId].information.description;

      const results = await updateSpecs(blockId, io, pipelineSpecs, editorMock);

      expect(results).toEqual(pipelineSpecs[blockId]);
    });

    test("update description when it changes", async () => {
      const expectedDescription = "New description";
      const pipelineSpecs = pipelineFixture.getSpecs().pipeline;
      const blockId = blockFixture.getId();
      const io = blockFixture.getCompilationIO();
      io.inputs.in1.type = pipelineSpecs[blockId].inputs.in1.type;
      io.inputs.in2.type = pipelineSpecs[blockId].inputs.in2.type;
      io.outputs.out1.type = pipelineSpecs[blockId].outputs.out1.type;
      io.outputs.out2.type = pipelineSpecs[blockId].outputs.out2.type;
      io.description = expectedDescription;

      const results = await updateSpecs(blockId, io, pipelineSpecs, editorMock);

      expect(results.information.description).toEqual(expectedDescription);
    });

    test("add input when a new parameter is added", async () => {
      const expectedInputName = "newInput";
      const expectedInput = { type: "Any", connections: [], relays: [] };
      const pipelineSpecs = pipelineFixture.getSpecs().pipeline;
      const blockId = blockFixture.getId();
      const io = blockFixture.getCompilationIO();
      io.inputs.in1.type = pipelineSpecs[blockId].inputs.in1.type;
      io.inputs.in2.type = pipelineSpecs[blockId].inputs.in2.type;
      io.outputs.out1.type = pipelineSpecs[blockId].outputs.out1.type;
      io.outputs.out2.type = pipelineSpecs[blockId].outputs.out2.type;
      io.description = pipelineSpecs[blockId].information.description;
      io.inputs[expectedInputName] = expectedInput;

      const results = await updateSpecs(blockId, io, pipelineSpecs, editorMock);

      expect(results.inputs).toHaveProperty(expectedInputName);
      expect(results.inputs[expectedInputName]).toEqual(expectedInput);
    });

    test("add output when a new output is added", async () => {
      const expectedOutputName = "newOutput";
      const expectedOutput = { type: "Any", connections: [], relays: [] };
      const pipelineSpecs = pipelineFixture.getSpecs().pipeline;
      const blockId = blockFixture.getId();
      const io = blockFixture.getCompilationIO();
      io.inputs.in1.type = pipelineSpecs[blockId].inputs.in1.type;
      io.inputs.in2.type = pipelineSpecs[blockId].inputs.in2.type;
      io.outputs.out1.type = pipelineSpecs[blockId].outputs.out1.type;
      io.outputs.out2.type = pipelineSpecs[blockId].outputs.out2.type;
      io.description = pipelineSpecs[blockId].information.description;
      io.outputs[expectedOutputName] = expectedOutput;

      const results = await updateSpecs(blockId, io, pipelineSpecs, editorMock);

      expect(results.outputs).toHaveProperty(expectedOutputName);
      expect(results.outputs[expectedOutputName]).toEqual(expectedOutput);
    });

    test("remove input when a paramater is removed", async () => {
      const pipelineSpecs = pipelineFixture.getSpecs().pipeline;
      const blockId = blockFixture.getId();
      const io = blockFixture.getCompilationIO();
      io.inputs.in1.type = pipelineSpecs[blockId].inputs.in1.type;
      io.inputs.in2.type = pipelineSpecs[blockId].inputs.in2.type;
      io.outputs.out1.type = pipelineSpecs[blockId].outputs.out1.type;
      io.outputs.out2.type = pipelineSpecs[blockId].outputs.out2.type;
      io.description = pipelineSpecs[blockId].information.description;
      delete io.inputs.in1;

      const results = await updateSpecs(blockId, io, pipelineSpecs, editorMock);

      expect(results.inputs).not.toHaveProperty("in1");
    });

    test("remove output when an output is removed", async () => {
      const pipelineSpecs = pipelineFixture.getSpecs().pipeline;
      const blockId = blockFixture.getId();
      const io = blockFixture.getCompilationIO();
      io.inputs.in1.type = pipelineSpecs[blockId].inputs.in1.type;
      io.inputs.in2.type = pipelineSpecs[blockId].inputs.in2.type;
      io.outputs.out1.type = pipelineSpecs[blockId].outputs.out1.type;
      io.outputs.out2.type = pipelineSpecs[blockId].outputs.out2.type;
      io.description = pipelineSpecs[blockId].information.description;
      delete io.outputs.out1;

      const results = await updateSpecs(blockId, io, pipelineSpecs, editorMock);

      expect(results.inputs).not.toHaveProperty("out1");
    });

    test("dont change existing input connections", async () => {
      const expectedConnection = connectionFixture.getConnection();
      const pipelineSpecs = pipelineFixture.getSpecs().pipeline;
      const blockId = blockFixture.getId();
      const io = blockFixture.getCompilationIO();
      io.inputs.in1.type = pipelineSpecs[blockId].inputs.in1.type;
      io.inputs.in2.type = pipelineSpecs[blockId].inputs.in2.type;
      io.outputs.out1.type = pipelineSpecs[blockId].outputs.out1.type;
      io.outputs.out2.type = pipelineSpecs[blockId].outputs.out2.type;
      io.description = pipelineSpecs[blockId].information.description;
      pipelineSpecs[blockId].inputs.in1.connections.push(expectedConnection);

      const results = await updateSpecs(blockId, io, pipelineSpecs, editorMock);

      expect(results.inputs.in1.connections).toEqual([expectedConnection]);
    });

    test("dont change existing output connections", async () => {
      const expectedConnection = connectionFixture.getConnection();
      const pipelineSpecs = pipelineFixture.getSpecs().pipeline;
      const blockId = blockFixture.getId();
      const io = blockFixture.getCompilationIO();
      io.inputs.in1.type = pipelineSpecs[blockId].inputs.in1.type;
      io.inputs.in2.type = pipelineSpecs[blockId].inputs.in2.type;
      io.outputs.out1.type = pipelineSpecs[blockId].outputs.out1.type;
      io.outputs.out2.type = pipelineSpecs[blockId].outputs.out2.type;
      io.description = pipelineSpecs[blockId].information.description;
      pipelineSpecs[blockId].outputs.out1.connections.push(expectedConnection);

      const results = await updateSpecs(blockId, io, pipelineSpecs, editorMock);

      expect(results.outputs.out1.connections).toEqual([expectedConnection]);
    });

    test("dont change existing input relays", async () => {
      const expectedRelays = "I don't know what goes in here";
      const pipelineSpecs = pipelineFixture.getSpecs().pipeline;
      const blockId = blockFixture.getId();
      const io = blockFixture.getCompilationIO();
      io.inputs.in1.type = pipelineSpecs[blockId].inputs.in1.type;
      io.inputs.in2.type = pipelineSpecs[blockId].inputs.in2.type;
      io.outputs.out1.type = pipelineSpecs[blockId].outputs.out1.type;
      io.outputs.out2.type = pipelineSpecs[blockId].outputs.out2.type;
      io.description = pipelineSpecs[blockId].information.description;
      pipelineSpecs[blockId].inputs.in1.relays.push(expectedRelays);

      const results = await updateSpecs(blockId, io, pipelineSpecs, editorMock);

      expect(results.inputs.in1.relays).toEqual([expectedRelays]);
    });

    test("dont change existing ouput relays", async () => {
      const expectedRelays = "I don't know what goes in here";
      const pipelineSpecs = pipelineFixture.getSpecs().pipeline;
      const blockId = blockFixture.getId();
      const io = blockFixture.getCompilationIO();
      io.inputs.in1.type = pipelineSpecs[blockId].inputs.in1.type;
      io.inputs.in2.type = pipelineSpecs[blockId].inputs.in2.type;
      io.outputs.out1.type = pipelineSpecs[blockId].outputs.out1.type;
      io.outputs.out2.type = pipelineSpecs[blockId].outputs.out2.type;
      io.description = pipelineSpecs[blockId].information.description;
      pipelineSpecs[blockId].outputs.out1.relays.push(expectedRelays);

      const results = await updateSpecs(blockId, io, pipelineSpecs, editorMock);

      expect(results.outputs.out1.relays).toEqual([expectedRelays]);
    });

    test("infered type changes the input type", async () => {
      const pipelineSpecs = pipelineFixture.getSpecs().pipeline;
      const blockId = blockFixture.getId();
      const io = blockFixture.getCompilationIO();
      io.inputs.in1.type = pipelineSpecs[blockId].inputs.in1.type;
      io.inputs.in2.type = pipelineSpecs[blockId].inputs.in2.type;
      io.outputs.out1.type = pipelineSpecs[blockId].outputs.out1.type;
      io.outputs.out2.type = pipelineSpecs[blockId].outputs.out2.type;
      io.description = pipelineSpecs[blockId].information.description;

      const results = await updateSpecs(blockId, io, pipelineSpecs, editorMock);

      expect(results.inputs.in1.type).toEqual(io.inputs.in1.type);
    });

    test("infered type changes the ouput type", async () => {
      const pipelineSpecs = pipelineFixture.getSpecs().pipeline;
      const blockId = blockFixture.getId();
      const io = blockFixture.getCompilationIO();
      io.inputs.in1.type = pipelineSpecs[blockId].inputs.in1.type;
      io.inputs.in2.type = pipelineSpecs[blockId].inputs.in2.type;
      io.outputs.out1.type = pipelineSpecs[blockId].outputs.out1.type;
      io.outputs.out2.type = pipelineSpecs[blockId].outputs.out2.type;
      io.description = pipelineSpecs[blockId].information.description;

      const results = await updateSpecs(blockId, io, pipelineSpecs, editorMock);

      expect(results.outputs.out1.type).toEqual(
        pipelineSpecs[blockId].outputs.out1.type,
      );
    });
  });
});
