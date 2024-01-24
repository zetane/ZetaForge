'use client'

import { useState, useEffect, useRef } from 'react';
import { drawflowEditorAtom } from '@/atoms/drawflowAtom';
import { useAtom } from 'jotai';
import Drawflow from '@/components/ZetaneDrawflowEditor'
import '@fortawesome/fontawesome-free/css/all.min.css'
import localFont from 'next/font/local'

const fontAwesome = localFont({
  src: '../../node_modules/@fortawesome/fontawesome-free/webfonts/fa-regular-400.woff2',
  display: 'swap'
})

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

const dropHandler = (event, editor) => {
  event.preventDefault()
  const jsonData = event.dataTransfer.getData("block");
  const data = JSON.parse(jsonData)
  addNodeToDrawFlow(editor, data, event.clientX, event.clientY);
}

const addNodeToDrawFlow = (editor, block, posX, posY) => {
  posX = posX * (editor.precanvas.clientWidth / (editor.precanvas.clientWidth * editor.zoom)) - (editor.precanvas.getBoundingClientRect().x * (editor.precanvas.clientWidth / (editor.precanvas.clientWidth * editor.zoom)));
  posY = posY * (editor.precanvas.clientHeight / (editor.precanvas.clientHeight * editor.zoom)) - (editor.precanvas.getBoundingClientRect().y * (editor.precanvas.clientHeight / (editor.precanvas.clientHeight * editor.zoom)));

  editor.addNode_from_JSON(block, posX, posY)
}

export default function DrawflowWrapper() {
  const [editor, setEditor] = useAtom(drawflowEditorAtom);
  const drawflowRef = useRef();

  useEffect(() => {
    const constructedEditor = launchDrawflow(drawflowRef.current)
    if (constructedEditor) {
      setEditor(constructedEditor)
    }
  }, [])

  return (
    <div id="drawflow" ref={drawflowRef}
      onDrop={(ev) => { dropHandler(ev, editor) }}
      onDragOver={(ev) => { dragOverHandler(ev) }}
    ></div>
  )
}