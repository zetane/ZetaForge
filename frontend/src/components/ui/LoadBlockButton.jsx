import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";
import { useRef } from "react";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { genJSON } from "@/utils/blockUtils";
import { customAlphabet } from "nanoid";

export default function LoadBlockButton() {
  const FILE_EXTENSION_REGEX = /\.[^/.]+$/;
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useAtom(pipelineAtom)
  const fileInput = useRef();

  const selectFile = () => {
    fileInput.current.click();
  };

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

  const loadBlock = async () => {
    const files = fileInput.current.files
    for (const key in files) {
      const file = files[key]
      const name = removeFileExtension(file.name)
      if (name === "specs_v1") {
        const spec = JSON.parse(await (new Blob([file])).text())
        addBlockToPipeline(spec)

        break;
      }
    }
  };

  const removeFileExtension = (fileName) => {
    return fileName.replace(FILE_EXTENSION_REGEX, "");
  };

  return (
    <div>
      <HeaderMenuItem onClick={selectFile}>Block</HeaderMenuItem>
      <input
        type="file"
        webkitdirectory=""
        directory=""
        ref={fileInput}
        onChange={(e) => { loadBlock(pipeline) }}
        hidden
      />
    </div>
  );
}
