import { useEffect, useRef, useState } from "react";

export const FileBlock = ({blockId, block, setFocusAction, history}) => {
  const fileInput = useRef();
  const [electronPath, setElectronPath] = useState(null)
  console.log("electron path: ", electronPath)
  console.log(block?.action?.parameters['path'])

  useEffect(() => {
    fileInput.current.value = ""
    setFocusAction((draft) => { draft.data[blockId].action.parameters['path'].value = ""})
  }, [])

  const loadFile = async (e) => {
    const files = fileInput.current.files
    const file = files[0]
    const value = file.path.toString()
    setElectronPath(value)
    setFocusAction((draft) => { draft.data[blockId].action.parameters['path'].value = value })
  }

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
