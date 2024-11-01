import { useEffect, useRef, useState } from "react";

export const FolderBlock = ({ blockId, block, setFocusAction, history }) => {
  const fileInput = useRef();
  const [renderPath, setRenderPath] = useState(null);
  const [folderName, setFolderName] = useState(
    block?.action?.parameters["folderName"]?.value || null,
  );
  const [filePaths, setFilePaths] = useState(() => {
    const existingPaths = block?.action?.parameters["path"]?.value || "[]";
    return JSON.parse(existingPaths);
  });

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

    const firstFilePath = filePaths[0];
    const pathSegments = firstFilePath.split(/[/\\]/);
    const extractedFolderName = pathSegments[pathSegments.length - 2];

    setFolderName(extractedFolderName);
    setFilePaths(filePaths);

    setFocusAction((draft) => {
      draft.data[blockId].action.parameters["path"].value = filePaths;
      draft.data[blockId].action.parameters["path"].type = "folder";
      draft.data[blockId].action.parameters["folderName"] = {
        type: "string",
        value: extractedFolderName,
      };
    });

    setRenderPath(extractedFolderName);
  };

  return (
    <div className="block-content">
      <div className="mb-2 pl-2">{renderPath}</div>
      <input
        id="folder-block"
        type="file"
        ref={fileInput}
        onChange={(e) => loadFiles(e)}
        webkitdirectory="true"
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
