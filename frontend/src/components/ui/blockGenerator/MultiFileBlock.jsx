import { useEffect, useRef, useState } from "react";

export const MultiFileBlock = ({ blockId, block, setFocusAction, history }) => {
  const fileInput = useRef();
  const [renderedFiles, setRenderedFiles] = useState([]);

  useEffect(() => {
    if (history) {
      const fileNames = block?.action?.parameters["files"]?.value.split(", ");
      const updatedFiles = fileNames.map((fileName) => {
        const fileSplit = fileName.split("/");
        return fileSplit.length > 1 ? fileSplit.at(-1) : fileName;
      });

      setFocusAction((draft) => {
        draft.data[blockId].action.parameters["files"].type = "file[]";
        draft.data[blockId].action.parameters["files"].value = fileNames.join(", ");
      });

      setRenderedFiles(updatedFiles);
    }
  }, [block]);

  const loadFiles = (e) => {
    const files = Array.from(fileInput.current.files);
    const filePaths = files.map((file) => file.name);
    const value = filePaths.join(", ");
    
    setFocusAction((draft) => {
      draft.data[blockId].action.parameters["files"].value = value;
      draft.data[blockId].action.parameters["files"].type = "file[]";
    });

    setRenderedFiles(filePaths);
  };

  return (
    <div className="block-content">
      <div className="mb-2 pl-2"></div>
      <input
        id="multi-file-input"
        type="file"
        ref={fileInput}
        onChange={(e) => loadFiles(e)}
        multiple
				parameters-path="true"
				style={{ // for better visibility.
					color: '#ffffff',
					backgroundColor: '#333333',
				}}
      />
    </div>
  );
};
