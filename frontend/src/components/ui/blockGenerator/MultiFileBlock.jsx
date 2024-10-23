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
        draft.data[blockId].action.parameters["files"].value =
          fileNames.join(", ");
      });

      setRenderedFiles(updatedFiles);
    }
  }, [block]);

  const processFiles = (files) => {
    const filePaths = [];
    const readDirectory = (dir, path = "") => {
      for (let i = 0; i < dir.length; i++) {
        const file = dir[i];
        const fullPath = path ? `${path}/${file.path}` : file.path;
        if (file.webkitDirectory) {
          readDirectory(file.children, fullPath);
        } else {
          filePaths.push(fullPath);
        }
      }
    };
    readDirectory(files, "");
    return filePaths;
  };

  const loadFiles = (e) => {
    const files = Array.from(fileInput.current.files);
    // console.log("FILES: " ,files)
    const filePaths = processFiles(files);
    // console.log("filePaths:" , filePaths)
    const formattedValue = `[${filePaths.map((file) => `"${file}"`).join(", ")}]`;
    // console.log("formatted value: " , formattedValue)
    setFocusAction((draft) => {
      draft.data[blockId].action.parameters["files"].value = formattedValue; // Update to formatted value
      draft.data[blockId].action.parameters["files"].type = "file[]";
    });

    setRenderedFiles(filePaths);
  };

  return (
    <div className="block-content">
      <div className="mb-2 pl-2">
        {renderedFiles.map((file, index) => (
          <div
            key={index}
            style={{ color: "#ffffff", backgroundColor: "#333333" }}
          >
            {file}
          </div>
        ))}
      </div>
      <input
        id="multi-file-input"
        type="file"
        ref={fileInput}
        onChange={(e) => loadFiles(e)}
        multiple
        parameters-path="true"
        style={{
          // for better visibility.
          color: "#ffffff",
        }}
      />
    </div>
  );
};
