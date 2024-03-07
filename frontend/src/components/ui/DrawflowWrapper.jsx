import { drawflowEditorAtom } from '@/atoms/drawflowAtom';
import { blockEditorRootAtom, isBlockEditorOpenAtom } from '@/atoms/editorAtom';
import { pipelineAtom } from "@/atoms/pipelineAtom";
import Drawflow from '@/components/ZetaneDrawflowEditor';
import { trpc } from "@/utils/trpc";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { useAtom, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import BlockGenerator from '@/components/ui/blockGenerator/BlockGenerator';
import { useImmerAtom } from 'jotai-immer';
import { genJSON } from '@/utils/blockUtils';
import { customAlphabet } from 'nanoid';

const launchDrawflow = (parentDomRef, canvasDomRef, openViewCallback) => {
  if (parentDomRef.className != "parent-drawflow") {
    const editor = new Drawflow(parentDomRef, openViewCallback, canvasDomRef);

    editor.reroute = true;
    editor.reroute_fix_curvature = true;
    editor.force_first_input = false;

    // Start the editor
    const init_object = {
      "drawflow": {
        "Home": {
          "data": {

          }
        },
        "Tab1": {
          "data": {

          }
        }
      }
    };
    editor.start();
    editor.import(init_object);
    window.graph = init_object;

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
  const drawflowParentRef = useRef(null);
  const drawflowCanvas = useRef(null);
  const pipelineRef = useRef(null)
  pipelineRef.current = pipeline

  const savePipeline = trpc.savePipeline.useMutation();
  const getBlockPath = trpc.getBlockPath.useMutation();

  useEffect(() => {
    const constructedEditor = launchDrawflow(drawflowParentRef.current, drawflowCanvas.current, openView);
    if (constructedEditor) {
      constructedEditor.on('nodeRemoved', (id) => removeNodeToDrawflow(id, pipelineRef.current));
      setEditor(constructedEditor);
      drawflowCanvas.current = constructedEditor.precanvas

    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (Object.getOwnPropertyNames(pipeline.data).length !== 0) {
          const pipelineSpecs = editor.convert_drawflow_to_block(pipeline.name);
  
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
  }, [pipeline.data])

  const addBlockToPipeline = (block) => {
    const nanoid = customAlphabet('1234567890abcedfghijklmnopqrstuvwxyz', 12)
    const newNanoid = nanoid()
    const id = `${block.information.id}-${newNanoid}`
    const json = genJSON(block, id)
    editor.addNode_from_JSON(json)
    setPipeline((draft) => {
      draft.data = {
        ...draft.data,
        [id]: block
      }
    })
    return id;
  }



  const dropHandler = async (event, editor) => {
    // Loads block to graph
    event.preventDefault()
    const jsonData = event.dataTransfer.getData("block");
    const spec = JSON.parse(jsonData)
    const block = setBlockPos(editor, spec, event.clientX, event.clientY)
    addBlockToPipeline(block, editor)
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

  let renderNodes = Object.entries(pipeline.data).map(([key, block]) => {
    return (<BlockGenerator key={key} block={block} openView={openView} id={key} editor={editor}/>)
  })

  return (
    <div id="drawflow" ref={drawflowParentRef}
      onDrop={(ev) => { dropHandler(ev, editor) }}
      onDragOver={(ev) => { dragOverHandler(ev) }}
    >
      <div ref={drawflowCanvas}>
        {renderNodes}
      </div>
    </div>
  )
}