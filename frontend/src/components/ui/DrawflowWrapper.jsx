import { drawflowEditorAtom } from '@/atoms/drawflowAtom';
import { blockEditorRootAtom, isBlockEditorOpenAtom } from '@/atoms/editorAtom';
import { pipelineAtom } from "@/atoms/pipelineAtom";
import Drawflow from '@/components/ZetaneDrawflowEditor';
import BlockGenerator from '@/components/ui/blockGenerator/BlockGenerator';
import { genJSON, generateId, replaceIds } from '@/utils/blockUtils';
import { trpc } from "@/utils/trpc";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { useAtom, useSetAtom } from 'jotai';
import { useImmerAtom } from 'jotai-immer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLoadPipeline } from "./useLoadPipeline";

const launchDrawflow = (parentDomRef, canvasDomRef, pipeline, setPipeline) => {
  if (parentDomRef.className != "parent-drawflow") {
    const editor = new Drawflow(parentDomRef, pipeline, setPipeline, canvasDomRef);

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
  event.preventDefault()
};


export default function DrawflowWrapper() {
  const [editor, setEditor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const setBlockEditorRoot = useSetAtom(blockEditorRootAtom);
  const setEditorOpen = useSetAtom(isBlockEditorOpenAtom);
  const [renderNodes, setRenderNodes] = useState([])
  const drawflowCanvas = useRef(null);
  const pipelineRef = useRef(null)
  pipelineRef.current = pipeline

  const savePipeline = trpc.savePipeline.useMutation();
  const getBlockPath = trpc.getBlockPath.useMutation();

  const createConnection = (connection, pipeline) => {
    const {output_id, input_id, output_class, input_class} = connection;
    const outputBlock = pipeline.data[output_id]
    const inputBlock = pipeline.data[input_id]
    if (outputBlock && inputBlock) {
      const outputConn = outputBlock.outputs[output_class]
      const inputConn = inputBlock.inputs[input_class]
      if (outputConn && inputConn) {
        const inputHasOutput = inputConn.connections.some((ele) => {
          return (ele.variable == output_class && ele.block == output_id)
        })
        if (!inputHasOutput) {
          setPipeline((draft) => {
            draft.data[input_id].inputs[input_class].connections.push({
              variable: output_class,
              block: output_id
            })
          })
        }

        const outputHasInput = outputConn.connections.some((ele) => {
          return (ele.variable == input_class && ele.block == input_id)
        })
        if (!outputHasInput) {
          setPipeline((draft) => {
            draft.data[output_id].outputs[output_class].connections.push({
             variable: input_class,
             block: input_id
            })
          })
        }
      }
    }
  }

  const removeConnection = (connection, pipeline) => {
    const {output_id, input_id, output_class, input_class} = connection;
    const outputBlock = pipeline.data[output_id]
    const inputBlock = pipeline.data[input_id]
    if (outputBlock && inputBlock) {
      const outputConn = outputBlock.outputs[output_class]
      const inputConn = inputBlock.inputs[input_class]
      if (outputConn && inputConn) {
        const inputHasOutput = inputConn.connections.some((ele) => {
          return (ele.variable == output_class && ele.block == output_id)
        })
        if (inputHasOutput) {
          setPipeline((draft) => {
            const newConns = inputConn.connections.filter((ele) => {
              return (ele.variable != output_class || ele.block != output_id)
            })
            draft.data[input_id].inputs[input_class].connections = newConns;
          })
        }

        const outputHasInput = outputConn.connections.some((ele) => {
          return (ele.variable == input_class && ele.block == input_id)
        })
        if (outputHasInput) {
          setPipeline((draft) => {
            const newConns = outputConn.connections.filter((ele) => {
              return (ele.variable != input_class || ele.block != input_id)
            })
            draft.data[output_id].outputs[output_class].connections = newConns;
          })
        }
      }
    }
  }

  const handleDrawflow = useCallback((node) => {
    if (!node) { return }
    const constructedEditor = launchDrawflow(node, drawflowCanvas.current, pipeline, setPipeline);
    if (constructedEditor) {
      constructedEditor.on('nodeRemoved', (id) => removeNodeToDrawflow(id, pipelineRef.current));
      constructedEditor.on('connectionCreated', (connection) => createConnection(connection, pipelineRef.current));
      constructedEditor.on('connectionRemoved', (connection) => removeConnection(connection, pipelineRef.current));
      setEditor(constructedEditor);
    }
  }, []);

  useEffect(() => {
    const blocks = pipeline?.data || []
    const nodes = Object.entries(blocks).map(([key, block]) => {
      return (<BlockGenerator key={key}
                block={block}
                openView={openView}
                id={key}
                historySink={pipeline.history}
                pipelineAtom={pipelineAtom}
                />)
    })
    setRenderNodes(nodes)
  }, [pipeline.data])

  useEffect(() => {
    if (renderNodes.length) {
      // Note: This code is super finicky because it's our declarative (React)
      // vs imperative (drawflow) boundary
      // We have to re-call these functions
      // IN THIS ORDER
      // because they programmatically
      // re-draw the connections in the graph
      editor.clearDrawflowData()
      editor.removeAllConnections()

      for (const [id, block] of Object.entries(pipeline.data)) {
        const json = genJSON(block, id)
        editor.addNode_from_JSON(json)
      }

      for (const [id, block] of Object.entries(pipeline.data)) {
        let outputNames = block.outputs
        for (const [outputKey, output] of Object.entries(outputNames)) {
          let inputConnections = output.connections;
          for (const input of inputConnections) {
            try {
              editor.addConnection(id, input.block, outputKey, input.variable);
            } catch (e) {
              console.log(e)
            }
          }
        }
      }

      const fetchData = async () => {
        try {
          if (Object.getOwnPropertyNames(pipeline.data).length !== 0) {
            const pipelineSpecs = editor.convert_drawflow_to_block(pipeline.name, pipeline.data);

            // note that we are writing to the buffer, not the load path
            pipelineSpecs['sink'] = pipeline.buffer;
            pipelineSpecs['build'] = pipeline.buffer;

            const saveData = {
              specs: pipelineSpecs,
              name: pipeline.name,
              buffer: pipeline.buffer,
              writePath: pipeline.buffer
            };

            const response = await savePipeline.mutateAsync(saveData);
            const { dirPath, specs } = response;
          }
        } catch (error) {
          console.error("Error saving pipeline:", error);
        }
      };

      fetchData();
    } else {
      if (editor) {
        editor.clearDrawflowData()
        editor.removeAllConnections()
      }
    }
  }, [renderNodes])

  const addBlockToPipeline = (block) => {
    const id = generateId(block);
    block = replaceIds(block, id);
    setPipeline((draft) => {
      draft.data[id] = block;
    })
    return id;
  }

  const dropHandler = async (event, editor) => {
    // Loads block to graph
    event.preventDefault()

    if (editor?.ele_selected?.classList[0] === 'input-element') {
      return;
    }

    const jsonData = event.dataTransfer.getData("block");
    const spec = JSON.parse(jsonData)
    const block = setBlockPos(editor, spec, event.clientX, event.clientY)
    addBlockToPipeline(block)
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

    return block
  }

  const removeNodeToDrawflow = (id, pipeline) => {
    let newNodes = {}
    for (const [key, node] of Object.entries(pipeline.data)) {
      if (key !== id) {
        newNodes[key] = node
      }
    }
    setPipeline((draft) => {
      draft.data = newNodes;
    })
  };

  const openView = async (id) => {
    const root = await getBlockPath.mutateAsync({
      blockId: id,
      pipelinePath: pipeline.buffer
    });
    setBlockEditorRoot(root);
    setEditorOpen(true);
  };


  const loadPipeline = useLoadPipeline();

  // Similar to LoadPipelineButton.jsx
  const handleFileChange = async (event, editor) => {
    const file = event.target.files[0];
    if (file) {
      await loadPipeline(file);
      event.target.value = ''; // Reset the file input
    }
  };

  const fileInput = useRef();

  return (
    <div id="drawflow" ref={handleDrawflow}
      onDrop={(ev) => {
        const blockData = ev.dataTransfer.getData("block");
        const pipelineData = ev.dataTransfer.getData("pipeline");
        if (blockData) {
          dropHandler(ev, editor);
        } else if (pipelineData) {
          const pipelineJson = JSON.parse(pipelineData);
          const file = new File([JSON.stringify(pipelineJson)], pipelineJson.name, {
            type: "application/json",
          });
          loadPipeline(file);
        }
      }}
      onDragOver={(ev) => { dragOverHandler(ev) }}
    >
      <div ref={drawflowCanvas}>
        {renderNodes}
      </div>
      <input
        type="file"
        ref={fileInput}
        onChange={(event) => handleFileChange(event, editor)}
        style={{ display: 'none' }}
      />

    </div>
  );
}
