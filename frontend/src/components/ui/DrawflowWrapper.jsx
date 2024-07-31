import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { blockEditorRootAtom, isBlockEditorOpenAtom } from "@/atoms/editorAtom";
import { pipelineAtom, workspaceAtom } from "@/atoms/pipelineAtom";
import { pipelineConnectionsAtom } from "@/atoms/pipelineConnectionsAtom";
import Drawflow from "@/components/ZetaneDrawflowEditor";
import BlockGenerator from "@/components/ui/blockGenerator/BlockGenerator";
import { generateId, replaceIds } from "@/utils/blockUtils";
import { trpc } from "@/utils/trpc";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { useAtom, useSetAtom } from "jotai";
import { useImmerAtom } from "jotai-immer";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLoadCorePipeline } from "@/hooks/useLoadPipeline";
import { createConnections } from "@/utils/createConnections";

const launchDrawflow = (
  parentDomRef,
  canvasDomRef,
  pipeline,
  setPipeline,
  connection_list,
  setConnectionList,
) => {
  if (parentDomRef.className != "parent-drawflow") {
    const editor = new Drawflow(
      parentDomRef,
      pipeline,
      setPipeline,
      canvasDomRef,
      connection_list,
      setConnectionList,
    );

    editor.reroute = true;
    editor.reroute_fix_curvature = true;
    editor.force_first_input = false;

    // Start the editor
    editor.start();
    return editor;
  }
  return null;
};

const dragOverHandler = (event) => {
  event.preventDefault();
};

export default function DrawflowWrapper() {
  const [editor, setEditor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [pipelineConnections, setPipelineConnections] = useImmerAtom(
    pipelineConnectionsAtom,
  );
  const setBlockEditorRoot = useSetAtom(blockEditorRootAtom);
  const setEditorOpen = useSetAtom(isBlockEditorOpenAtom);
  const [renderNodes, setRenderNodes] = useState([]);
  const drawflowCanvas = useRef(null);
  const pipelineRef = useRef(null);
  const nodeRefs = useRef({});
  const loadPipeline = useLoadCorePipeline();

  const addNodeRefs = (nodeList) => {
    nodeRefs.current = { ...nodeRefs.current, ...nodeList };
  };

  const removeNodeRefs = (blockId) => {
    const newRefs = { ...nodeRefs.current };
    Object.keys(newRefs).forEach((key) => {
      if (key.startsWith(blockId)) {
        delete newRefs[key];
      }
    });
    nodeRefs.current = newRefs;
  };

  pipelineRef.current = pipeline;

  const savePipeline = trpc.savePipeline.useMutation();
  const getBlockPath = trpc.getBlockPath.useMutation();

  const handleDrawflow = useCallback((node) => {
    if (!node) {
      return;
    }
    const constructedEditor = launchDrawflow(
      node,
      drawflowCanvas.current,
      pipeline,
      setPipeline,
      pipelineConnections,
      setPipelineConnections,
    );
    if (constructedEditor) {
      setEditor(constructedEditor);
    }
  }, []);

  useEffect(() => {
    const blocks = pipeline?.data || {};
    const nodes = Object.entries(blocks).map(([key, block]) => {
      const uniqueKey = pipeline.history + "/" + key;
      return (
        <BlockGenerator
          key={uniqueKey}
          block={block}
          openView={openView}
          id={key}
          history={pipeline.history}
          pipelineId={pipeline?.record?.Uuid}
          executionId={pipeline?.record?.Execution}
          addNodeRefs={addNodeRefs}
          removeNodeRefs={removeNodeRefs}
          nodeRefs={nodeRefs}
        />
      );
    });

    setRenderNodes(nodes);
  }, [pipeline?.data]);

  useEffect(() => {
    if (editor) {
      editor.pipeline = pipeline;
      editor.connection_list = pipelineConnections;
      editor.nodeRefs = nodeRefs.current;
      editor.addConnection();
      editor.updateAllConnections();
    }
  }, [pipelineConnections]);

  useEffect(() => {
    const newConnections = createConnections(
      pipeline?.data,
      pipelineConnections,
    );
    if (editor) {
      editor.syncConnections(newConnections);
    }
    setPipelineConnections((draft) => (draft = newConnections));

    const syncData = async () => {
      try {
        if (Object.getOwnPropertyNames(pipeline?.data).length !== 0) {
          const pipelineSpecs = editor.convert_drawflow_to_block(
            pipeline.name,
            pipeline.data,
          );
          // note that we are writing to the buffer, not the load path
          pipelineSpecs["sink"] = pipeline.buffer;
          pipelineSpecs["build"] = pipeline.buffer;

          const saveData = {
            specs: pipelineSpecs,
            name: pipeline?.name,
            buffer: pipeline?.buffer,
            writePath: pipeline?.buffer,
          };

          await savePipeline.mutateAsync(saveData);
        }
      } catch (error) {
        console.error("Error saving pipeline:", error);
      }
    };

    syncData();
  }, [renderNodes]);

  const addBlockToPipeline = (block) => {
    const id = generateId(block);
    block = replaceIds(block, id);
    setPipeline((draft) => {
      draft.data[id] = block;
    });
    return id;
  };

  const handleDrop = async (ev) => {
    const blockData = ev.dataTransfer.getData("block");
    const pipelineData = ev.dataTransfer.getData("pipeline");
    if (blockData) {
      dropBlock(ev, blockData, editor);
    } else if (pipelineData) {
      dropPipeline(pipelineData);
    }
  };

  const dropBlock = async (event, blockData, editor) => {
    // Loads block to graph
    event.preventDefault();

    if (editor?.ele_selected?.classList[0] === "input-element") {
      return;
    }

    const spec = JSON.parse(blockData);
    const block = setBlockPos(editor, spec, event.clientX, event.clientY);
    addBlockToPipeline(block);
  };

  const dropPipeline = (pipelineData) => {
    const pipelineJson = JSON.parse(pipelineData);
    const { specs, path } = pipelineJson;
    loadPipeline(specs, path);
  };

  const setBlockPos = (editor, block, posX, posY) => {
    if (editor.editor_mode === "fixed") {
      return block;
    }
    block.views.node.pos_x =
      posX *
        (editor.precanvas.clientWidth /
          (editor.precanvas.clientWidth * editor.zoom)) -
      editor.precanvas.getBoundingClientRect().x *
        (editor.precanvas.clientWidth /
          (editor.precanvas.clientWidth * editor.zoom));
    block.views.node.pos_y =
      posY *
        (editor.precanvas.clientHeight /
          (editor.precanvas.clientHeight * editor.zoom)) -
      editor.precanvas.getBoundingClientRect().y *
        (editor.precanvas.clientHeight /
          (editor.precanvas.clientHeight * editor.zoom));

    return block;
  };

  const openView = async (id) => {
    const root = await getBlockPath.mutateAsync({
      blockId: id,
      pipelinePath: pipeline.buffer,
    });
    setBlockEditorRoot(root);
    setEditorOpen(true);
  };

  return (
    <div
      id="drawflow"
      ref={handleDrawflow}
      onDrop={handleDrop}
      onDragOver={(ev) => {
        dragOverHandler(ev);
      }}
    >
      <div ref={drawflowCanvas}>{renderNodes}</div>
    </div>
  );
}
