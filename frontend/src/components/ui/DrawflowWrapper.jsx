import { drawflowEditorAtom } from '@/atoms/drawflowAtom';
import { blockEditorRootAtom, isBlockEditorOpenAtom } from '@/atoms/editorAtom';
import { pipelineAtom } from "@/atoms/pipelineAtom";
import Drawflow from '@/components/ZetaneDrawflowEditor';
import { trpc } from "@/utils/trpc";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { useAtom, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';

const launchDrawflow = (domRef, openViewCallback) => {
  if (domRef.className != "parent-drawflow") {
    const editor = new Drawflow(domRef, openViewCallback);

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
  const [pipeline, setPipeline] = useAtom(pipelineAtom);
  const setBlockEditorRoot = useSetAtom(blockEditorRootAtom);
  const setEditorOpen = useSetAtom(isBlockEditorOpenAtom);
  const drawflowRef = useRef();

  const saveBlock = trpc.saveBlock.useMutation();
  const removeBlock = trpc.removeBlock.useMutation();
  const getBlockPath = trpc.getBlockPath.useMutation();

  useEffect(() => {
    const constructedEditor = launchDrawflow(drawflowRef.current, openView);
    if (constructedEditor) {
      setEditor(constructedEditor);
      constructedEditor.registerRemoveNode(removeNodeToDrawflow);
    }
  }, []);

  const dropHandler = async (event, editor) => {
    event.preventDefault()
    const jsonData = event.dataTransfer.getData("block");
    const spec = JSON.parse(jsonData)
    const blockId = addNodeToDrawFlow(editor, spec, event.clientX, event.clientY);
    const data = {
      blockSpec: spec,
      blockId: blockId,
      blockPath: "../core/blocks",
      pipelinePath: pipeline.buffer
    }
    const res = await saveBlock.mutateAsync(data)
    console.log("save res: ", res)
  };

  const addNodeToDrawFlow = (editor, block, posX, posY) => {
    if (editor.editor_mode === "fixed") {
      return false;
    }
    posX =
      posX *
        (editor.precanvas.clientWidth /
          (editor.precanvas.clientWidth * editor.zoom)) -
      editor.precanvas.getBoundingClientRect().x *
        (editor.precanvas.clientWidth /
          (editor.precanvas.clientWidth * editor.zoom));
    posY =
      posY *
        (editor.precanvas.clientHeight /
          (editor.precanvas.clientHeight * editor.zoom)) -
      editor.precanvas.getBoundingClientRect().y *
        (editor.precanvas.clientHeight /
          (editor.precanvas.clientHeight * editor.zoom));

    const id = editor.addNode_from_JSON(block, posX, posY);
    return id;
  };

  const removeNodeToDrawflow = (id) => {
    removeBlock.mutate({
      blockId: id,
      pipelinePath: pipeline.buffer
    });
  };

  const openView = async (id) => {
    const root = await getBlockPath.mutateAsync({
      blockId: id, 
      pipelinePath: 
      pipeline.buffer
    });
    setBlockEditorRoot(root);
    setEditorOpen(true);
  };

  return (
    <div id="drawflow" ref={drawflowRef}
      onDrop={(ev) => { dropHandler(ev, editor) }}
      onDragOver={(ev) => { dragOverHandler(ev) }}
    ></div>
  )
}