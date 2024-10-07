import { useEffect, useRef, useState } from "react";
import { trimQuotes } from "@/utils/blockUtils";

export const FolderBlock = ({ blockId, block, setFocusAction, history }) => {
  const fileInput = useRef();
  const [renderPath, setRenderPath] = useState(null);

  useEffect(() => {
    const type = block?.action?.parameters["path"]?.type;
    if (history && type !== "fileLoad") {
      let fileName = block?.action?.parameters["path"]?.value;
      const fileSplit = fileName.split("/");
      if (fileSplit.length > 1) {
        fileName = fileSplit.at(-1);
      }
      fileName = trimQuotes(fileName);
      const s3Url = history + "/" + fileName;
      setFocusAction((draft) => {
        draft.data[blockId].action.parameters["path"].value = s3Url;
        draft.data[blockId].action.parameters["path"].type = "blob";
      });
      setRenderPath("Default Name");
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
    const filePaths = processFiles(files);
    const formattedValue = `[${filePaths.map((file) => `"${file}"`).join(", ")}]`;

    setFocusAction((draft) => {
      draft.data[blockId].action.parameters["path"].value = formattedValue;
      draft.data[blockId].action.parameters["path"].type = "folder";
    });
    setRenderPath("Default Name");
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
