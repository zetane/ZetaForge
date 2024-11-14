import { useEffect, useRef, useState } from "react";

export const MultiFileBlock = ({ blockId, block, setFocusAction, history }) => {
  const fileInput = useRef();
  const [renderedFiles, setRenderedFiles] = useState([]);

  useEffect(() => {
    const type = block?.action?.parameters["files"]?.type;
    const value = block?.action?.parameters["files"]?.value;
    if (history && type != "file[]" && typeof value == "string") {
      const fileNames = JSON.parse(value);
      const s3Files = fileNames.map((name) => {
        return history + "/" + name;
      });

      setFocusAction((draft) => {
        draft.data[blockId].action.parameters["files"].type = "blob[]";
        draft.data[blockId].action.parameters["files"].value = s3Files;
      });

      setRenderedFiles(fileNames);
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

  const loadFiles = () => {
    const files = Array.from(fileInput.current.files);
    const filePaths = processFiles(files);
    setFocusAction((draft) => {
      draft.data[blockId].action.parameters["files"].value = filePaths; // Update to formatted value
      draft.data[blockId].action.parameters["files"].type = "file[]";
    });

    setRenderedFiles(filePaths);
  };

  return (
    <div className="block-content">
      <div className="mb-2 pl-2">
        {renderedFiles.map((file, index) => (
          <div key={index}>{file}</div>
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
          color: "#ffffff",
        }}
      />
    </div>
  );
};
