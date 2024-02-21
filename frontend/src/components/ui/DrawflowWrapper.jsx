import { useState, useEffect, useRef } from 'react';
import { drawflowEditorAtom } from '@/atoms/drawflowAtom';
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { useAtom } from 'jotai';
import Drawflow from '@/components/ZetaneDrawflowEditor'
import '@fortawesome/fontawesome-free/css/all.min.css'
import { trpc } from "@/utils/trpc"

const launchDrawflow = (domRef) => {
  if (domRef.className != 'parent-drawflow') {
    const editor = new Drawflow(domRef);

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

    return editor
  }
  return null
}

const dragOverHandler = (event) => {
  event.preventDefault()
}



const addNodeToDrawFlow = (editor, block, posX, posY) => {
  posX = posX * (editor.precanvas.clientWidth / (editor.precanvas.clientWidth * editor.zoom)) - (editor.precanvas.getBoundingClientRect().x * (editor.precanvas.clientWidth / (editor.precanvas.clientWidth * editor.zoom)));
  posY = posY * (editor.precanvas.clientHeight / (editor.precanvas.clientHeight * editor.zoom)) - (editor.precanvas.getBoundingClientRect().y * (editor.precanvas.clientHeight / (editor.precanvas.clientHeight * editor.zoom)));

  editor.addNode_from_JSON(block, posX, posY)
}

export default function DrawflowWrapper() {
  const [editor, setEditor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useAtom(pipelineAtom);
  const drawflowRef = useRef();

  const dropHandler = async (event, editor, saveBlock) => {
    event.preventDefault()
    const jsonData = event.dataTransfer.getData("block");
    const spec = JSON.parse(jsonData)
    addNodeToDrawFlow(editor, spec, event.clientX, event.clientY);
    const data = {
      blockSpec: spec,
      blockPath: "../core/blocks",
      pipelinePath: pipeline.buffer
    }
    const res = await saveBlock.mutate(data)
    console.log("save res: ", res)
  }

  useEffect(() => {
    const constructedEditor = launchDrawflow(drawflowRef.current)
    if (constructedEditor) {
      setEditor(constructedEditor)
    }
  }, [])

  const saveBlock = trpc.saveBlock.useMutation();

  return (
    <div id="drawflow" ref={drawflowRef}
      onDrop={(ev) => { dropHandler(ev, editor, saveBlock) }}
      onDragOver={(ev) => { dragOverHandler(ev) }}
    ></div>
  )
}