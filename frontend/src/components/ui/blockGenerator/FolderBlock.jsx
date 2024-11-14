import { useEffect, useRef, useState } from "react";
import { TreeView, TreeNode } from "@carbon/react";
import { Folder, Document } from "@carbon/icons-react";

export const FolderBlock = ({ blockId, block, setFocusAction, history }) => {
  const fileInput = useRef();
  const [renderPath, setRenderPath] = useState(null);
  const [folderName, setFolderName] = useState(
    block?.action?.parameters["folderName"]?.value || null,
  );
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const type = block?.action?.parameters["path"]?.type;
    const value = block?.action?.parameters["path"]?.value;
    if (history && type == "folderBlob" && typeof value == "string") {
      const paths = JSON.parse(value);
      const s3Files = paths.map((name) => {
        return history + "/" + name;
      });
      setFocusAction((draft) => {
        draft.data[blockId].action.parameters["path"].type = "folderBlob";
        draft.data[blockId].action.parameters["path"].value = s3Files;
        draft.data[blockId].action.parameters["folderName"] = {
          type: "string",
          value: folderName,
        };
      });

      const folderInfo = {
        files: paths,
        folderName: folderName,
      };
      setRenderPath(folderInfo);
    }
  }, [block, folderName]);

  const processFiles = (files) => {
    const filePaths = [];
    const readDirectory = (dir, path = "") => {
      for (let i = 0; i < dir.length; i++) {
        const file = dir[i];
        const fullPath = path ? `${path}/${file.path}` : file.path;
        if (file.webkitDirectory) {
          readDirectory(file.children, fullPath);
        } else {
          const baseName = file.path.split("/").at(-1);
          // DS STORE I BANISH THEE
          if (baseName != ".DS_Store") {
            filePaths.push(fullPath);
          }
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

    setFocusAction((draft) => {
      draft.data[blockId].action.parameters["path"].value = filePaths;
      draft.data[blockId].action.parameters["path"].type = "folder";
      draft.data[blockId].action.parameters["folderName"] = {
        type: "string",
        value: extractedFolderName,
      };
    });

    const folderInfo = {
      files: filePaths,
      folderName: extractedFolderName,
    };

    setRenderPath(folderInfo);
  };

  let treeView = null;
  if (renderPath?.folderName) {
    treeView = (
      <TreeView>
        <TreeNode
          key={0}
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded(!isExpanded)}
          label={renderPath.folderName}
          renderIcon={Folder}
          value={renderPath.folderName}
        >
          {renderPath.files.map((filePath, index) => (
            <TreeNode
              key={index + 1}
              label={filePath}
              value={filePath}
              renderIcon={Document}
              isSelectable={false}
              onSelect={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          ))}
        </TreeNode>
      </TreeView>
    );
  }

  return (
    <div className="block-content">
      {treeView}
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
