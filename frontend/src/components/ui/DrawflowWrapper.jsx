import { drawflowEditorAtom } from '@/atoms/drawflowAtom';
import { blockEditorRootAtom, isBlockEditorOpenAtom } from '@/atoms/editorAtom';
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { pipelineConnectionsAtom } from "@/atoms/pipelineConnectionsAtom";
import { pipelineSchemaAtom } from "@/atoms/pipelineSchemaAtom";
import Drawflow from '@/components/ZetaneDrawflowEditor';
import { trpc } from "@/utils/trpc";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { useAtom, useSetAtom } from 'jotai';
import { useEffect, useRef, useState, useCallback } from 'react';
import BlockGenerator from '@/components/ui/blockGenerator/BlockGenerator';
import { useImmerAtom } from 'jotai-immer';
import { genJSON } from '@/utils/blockUtils';
import { customAlphabet } from 'nanoid';
import { useLoadPipeline } from "./useLoadPipeline";
import generateSchema from '@/utils/schemaValidation';
import drawflowUtils from '@/utils/drawflowUtils';

// const launchDrawflow = (parentDomRef, canvasDomRef, pipeline, setPipeline) => {
//   if (parentDomRef.className != "parent-drawflow") {
//     const editor = new Drawflow(parentDomRef, pipeline, setPipeline, canvasDomRef);

//     // editor.reroute = true;
//     // editor.reroute_fix_curvature = true;
//     // editor.force_first_input = false;

//     // Start the editor
//     editor.start();
//     return editor;
//   }
//   return null;
// };

const dragOverHandler = (event) => {
  event.preventDefault()
};


export default function DrawflowWrapper() {
  const [editor, setEditor] = useAtom(drawflowEditorAtom);
  const [, setPipelineSchema] = useAtom(pipelineSchemaAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [pipelineConnections, setPipelineConnectionsAtom] = useImmerAtom(pipelineConnectionsAtom);
  const setBlockEditorRoot = useSetAtom(blockEditorRootAtom);
  const setEditorOpen = useSetAtom(isBlockEditorOpenAtom);
  const [renderNodes, setRenderNodes] = useState([])
  const drawflowCanvas = useRef(null);
  const pipelineRef = useRef(null)

  pipelineRef.current = pipeline

  const savePipeline = trpc.savePipeline.useMutation();
  const getBlockPath = trpc.getBlockPath.useMutation();
  
  // Redraw the connections when resizing textarea
  useEffect(() => {
    // if (!editor) return;

    const resizeObserver = new ResizeObserver(entries => {
        entries.forEach(entry => {
            if (entry.target.classList.contains('textarea-node')) {
                drawflowUtils.updateAllConnections();
            }
        });
    });

    const textareas = document.querySelectorAll('.textarea-node');
    textareas.forEach(textarea => resizeObserver.observe(textarea));

    return () => resizeObserver.disconnect();
  }, [renderNodes]);


  // const createConnection = (connection, pipeline) => {
  //   const {output_id, input_id, output_class, input_class} = connection;
  //   const outputBlock = pipeline.data[output_id]
  //   const inputBlock = pipeline.data[input_id]
  //   if (outputBlock && inputBlock) {
  //     const outputConn = outputBlock.outputs[output_class]
  //     const inputConn = inputBlock.inputs[input_class]
  //     if (outputConn && inputConn) {
  //       const inputHasOutput = inputConn.connections.some((ele) => {
  //         return (ele.variable == output_class && ele.block == output_id)
  //       })
  //       if (!inputHasOutput) {
  //         setPipeline((draft) => {
  //           draft.data[input_id].inputs[input_class].connections.push({
  //             variable: output_class,
  //             block: output_id
  //           })
  //         })
  //       }

  //       const outputHasInput = outputConn.connections.some((ele) => {
  //         return (ele.variable == input_class && ele.block == input_id)
  //       })
  //       if (!outputHasInput) {
  //         setPipeline((draft) => {
  //           draft.data[output_id].outputs[output_class].connections.push({
  //            variable: input_class,
  //            block: input_id
  //           })
  //         })
  //       }
  //     }
  //   }
  // }

  // const removeConnection = (connection, pipeline) => {
  //   const {output_id, input_id, output_class, input_class} = connection;
  //   const outputBlock = pipeline.data[output_id]
  //   const inputBlock = pipeline.data[input_id]
  //   if (outputBlock && inputBlock) {
  //     const outputConn = outputBlock.outputs[output_class]
  //     const inputConn = inputBlock.inputs[input_class]
  //     if (outputConn && inputConn) {
  //       const inputHasOutput = inputConn.connections.some((ele) => {
  //         return (ele.variable == output_class && ele.block == output_id)
  //       })
  //       if (inputHasOutput) {
  //         setPipeline((draft) => {
  //           const newConns = inputConn.connections.filter((ele) => {
  //             return (ele.variable != output_class || ele.block != output_id)
  //           })
  //           draft.data[input_id].inputs[input_class].connections = newConns;
  //         })
  //       }

  //       const outputHasInput = outputConn.connections.some((ele) => {
  //         return (ele.variable == input_class && ele.block == input_id)
  //       })
  //       if (outputHasInput) {
  //         setPipeline((draft) => {
  //           const newConns = outputConn.connections.filter((ele) => {
  //             return (ele.variable != input_class || ele.block != input_id)
  //           })
  //           draft.data[output_id].outputs[output_class].connections = newConns;
  //         })
  //       }
  //     }
  //   }
  // }

  const handleDrawflow = useCallback((node) => {
    if (node) {
      drawflowUtils.precanvas = drawflowCanvas.current;
      drawflowUtils.container = node;
      drawflowUtils.reroute = true;
      drawflowUtils.reroute_fix_curvature = true;
      drawflowUtils.force_first_input = false;
      drawflowUtils.setPipeline = setPipeline;
      drawflowUtils.pipeline = pipeline;
      drawflowUtils.updateConnectionList = setPipelineConnectionsAtom;

      /* Update data Nodes */
      node.addEventListener('dblclick', drawflowUtils.dblclick)

      /* Mouse and Touch Actions */
      node.addEventListener('mouseup', drawflowUtils.dragEnd)
      node.addEventListener('mousemove', drawflowUtils.position)
      node.addEventListener('mousedown', drawflowUtils.click)

      node.addEventListener('touchend', drawflowUtils.dragEnd)
      node.addEventListener('touchmove', drawflowUtils.position)
      node.addEventListener('touchstart', drawflowUtils.click)

      /* Context Menu */
      node.addEventListener('contextmenu', drawflowUtils.contextmenu)

      /* Delete */
      node.addEventListener('keydown', drawflowUtils.key)

      /* Zoom Mouse */
      node.addEventListener('wheel', drawflowUtils.zoom_enter)

      /* Mobile zoom */
      node.addEventListener('onpointerdown', drawflowUtils.pointerdown_handler)
      node.addEventListener('onpointermove', drawflowUtils.pointermove_handler)
      node.addEventListener('onpointerup', drawflowUtils.pointerup_handler)
      node.addEventListener('onpointercancel', drawflowUtils.pointerup_handler)
      node.addEventListener('onpointerout', drawflowUtils.pointerup_handler)
      node.addEventListener('onpointerleave', drawflowUtils.pointerup_handler)
    } else { return }
    // const constructedEditor = launchDrawflow(node, drawflowCanvas.current, pipeline, setPipeline);
    // if (constructedEditor) {
      // constructedEditor.on('nodeRemoved', (id) => removeNodeToDrawflow(id, pipelineRef.current));
      // constructedEditor.on('connectionCreated', (connection) => createConnection(connection, pipelineRef.current));
      // constructedEditor.on('connectionRemoved', (connection) => removeConnection(connection, pipelineRef.current));
      // constructedEditor.on('drawingConnection', (node) => drawflowUtils.drawConnection(node, constructedEditor, drawflowCanvas.current));
      // constructedEditor.on('updateConnection', ({eX, eY}) => drawflowUtils.updateConnection(eX, eY, constructedEditor, drawflowCanvas.current));
    //   setEditor(constructedEditor);
    // }
  }, []);

  useEffect(() => {
    const nodes = Object.entries(pipeline.data).map(([key, block]) => {
      return (<BlockGenerator key={key} 
                block={block} 
                openView={openView} 
                id={key} 
                historySink={pipeline.history} 
                pipelineAtom={pipelineAtom}
                />)
    })
    drawflowUtils.pipeline = pipeline;
    setRenderNodes(nodes)
    console.log("pipeline: ", pipeline.data)
  }, [pipeline.data])

  useEffect(() => {
    if (pipeline.data && Object.keys(pipeline.data).length) {
      const schema = generateSchema(pipeline.data);
      setPipelineSchema(schema);
    } else {
      setPipelineSchema({});
    }
  }, [Object.keys(pipeline.data).length])

  useEffect(() => {
    if (renderNodes.length) {
      // Note: This code is super finicky because it's our declarative (React)
      // vs imperative (drawflow) boundary
      // We have to re-call these functions 
      // IN THIS ORDER
      // because they programmatically
      // re-draw the connections in the graph
      for (const [id, block] of Object.entries(pipeline.data)) {
        const json = genJSON(block, id)
        drawflowUtils.addNode_from_JSON(json)
      }

      try {
        drawflowUtils.connection_list = pipelineConnections;
        console.log(pipelineConnections)
        drawflowUtils.addConnection();
      } catch (e) {
        console.log(e)
      }
      // for (const [id, block] of Object.entries(pipeline.data)) {
      //   let outputNames = block.outputs
      //   for (const [outputKey, output] of Object.entries(outputNames)) {
      //     let inputConnections = output.connections;
      //     for (const input of inputConnections) {
      //       try {
      //         // editor.addConnection(id, input.block, outputKey, input.variable);
      //         // drawflowUtils.addConnection(id, input.block, outputKey, input.variable, drawflowCanvas.current, editor);
      //       } catch (e) {
      //         console.log(e)
      //       }
      //     }
      //   }
      // }

      const fetchData = async () => {
        try {
          if (Object.getOwnPropertyNames(pipeline.data).length !== 0) {
            const pipelineSpecs = drawflowUtils.convert_drawflow_to_block(pipeline.name, pipeline.data);
            // console.log("pipeline.data: ", pipeline.data)
            // console.log("pipelineSpecs: ", pipelineSpecs)
            // note that we are writing to the buffer, not the load path
            pipelineSpecs['sink'] = pipeline.buffer;
            pipelineSpecs['build'] = pipeline.buffer;
    
            const saveData = {
              specs: pipelineSpecs,
              name: pipeline.name,
              buffer: pipeline.buffer,
              writePath: pipeline.buffer,
            };
            
            // console.log("save data: ", saveData)
            const response = await savePipeline.mutateAsync(saveData);
            // console.log("response: ", response)
            const { dirPath, specs } = response;
          }
        } catch (error) {
          console.error("Error saving pipeline:", error);
        }
      };
  
      fetchData();
    } else {
      if (editor) {
        drawflowUtils.clear()
      }
    }
  }, [renderNodes])

  const addBlockToPipeline = (block) => {
    const nanoid = customAlphabet('1234567890abcedfghijklmnopqrstuvwxyz', 12)
    const newNanoid = nanoid()
    const id = `${block.information.id}-${newNanoid}`
    setPipeline((draft) => {
      draft.data[id] = block;
    })
    return id;
  }

  const dropHandler = async (event, editor) => {
    // Loads block to graph
    event.preventDefault()

    if (drawflowUtils?.ele_selected?.classList[0] === 'input-element') {
      return;
    }

    const jsonData = event.dataTransfer.getData("block");
    const spec = JSON.parse(jsonData)
    const block = setBlockPos(drawflowUtils, spec, event.clientX, event.clientY)
    addBlockToPipeline(block, drawflowUtils)
  };

  const setBlockPos = (editor, block, posX, posY) => {
    if (drawflowUtils.editor_mode === "fixed") {
      return block;
    }
    block.views.node.pos_x =
      posX *
        (drawflowUtils.precanvas.clientWidth /
          (drawflowUtils.precanvas.clientWidth * drawflowUtils.zoom)) -
      drawflowUtils.precanvas.getBoundingClientRect().x *
        (drawflowUtils.precanvas.clientWidth /
          (drawflowUtils.precanvas.clientWidth * drawflowUtils.zoom));
    block.views.node.pos_y =
      posY *
        (drawflowUtils.precanvas.clientHeight /
          (drawflowUtils.precanvas.clientHeight * drawflowUtils.zoom)) -
      drawflowUtils.precanvas.getBoundingClientRect().y *
        (drawflowUtils.precanvas.clientHeight /
          (drawflowUtils.precanvas.clientHeight * drawflowUtils.zoom));

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
    <div
      id="drawflow"
      className="parent-drawflow"
      ref={handleDrawflow}
      tabIndex={0}
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
      <div
        ref={drawflowCanvas}
        className="drawflow"
      >
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
