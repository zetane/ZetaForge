import { useRef } from "react";

export const FileBlock = ({blockId, block, setFocusAction}) => {
  const fileInput = useRef();

  const loadFile = async (e) => {
    const files = fileInput.current.files
    const file = files[0]
    const value = file.path.toString()

    setFocusAction((draft) => { draft.data[blockId].action.parameters['path'].value = value })
  }

  const path = block.action.parameters?.path?.value || '';

  return (
    <div className="block-content">
      <input
        id="file-block"
        type="file"
        ref={fileInput}
        onChange={(e) => { loadFile(e) }}
        parameters-path="true"
      />
    </div>
  )
}