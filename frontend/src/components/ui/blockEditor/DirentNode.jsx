import { Document, Folder } from "@carbon/icons-react";
import { TreeNode } from "@carbon/react";

export default function DirentNode({
  folder,
  folderData,
  parentPath = "",
  unsavedChanges,
  setCurrentFile,
  ...rest
}) {
  const content = folderData?.content ?? {};
  const currentPath = parentPath ? `${parentPath}/${folder}` : folder;

  const specialFiles = ["computations.py", "Dockerfile", "requirements.txt"];
  const isSpecialFile = specialFiles.includes(folder);
  const textStyle = isSpecialFile
    ? { color: "darkorange", paddingRight: "4px", paddingLeft: "4px" }
    : {};

  const onToggle = (folderPath) => {
    setFileSystem((prevFileSystem) => {
      const toggleFolder = (pathSegments, fileSystem) => {
        if (!fileSystem || typeof fileSystem !== "object") {
          return fileSystem;
        }

        const [currentSegment, ...remainingSegments] = pathSegments;
        if (!fileSystem[currentSegment]) {
          console.error(
            `No such folder: ${currentSegment} in path ${folderPath}`,
          );
          return fileSystem;
        }

        if (!remainingSegments.length) {
          return {
            ...fileSystem,
            [currentSegment]: {
              ...fileSystem[currentSegment],
              expanded: !fileSystem[currentSegment].expanded,
            },
          };
        } else {
          return {
            ...fileSystem,
            [currentSegment]: {
              ...fileSystem[currentSegment],
              content: toggleFolder(
                remainingSegments,
                fileSystem[currentSegment].content,
              ),
            },
          };
        }
      };
      let relPath = folderPath.replaceAll("\\", "/");

      return toggleFolder(relPath.split("/"), prevFileSystem);
    });
  };

  const handleFileClick = (filePath) => {
    if (unsavedChanges) {
      setPendingFile(filePath);
      setIsModalOpen(true);
    } else {
      if (filePath.endsWith(".html")) {
        const fileContent = folderData.content;
        const blob = new Blob([fileContent], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        setCurrentFile({ path: filePath, content: folderData.content });
      }
    }
  };

  return (
    <TreeNode
      key={folder}
      onClick={() =>
        folderData.type === "folder"
          ? onToggle(currentPath)
          : handleFileClick(currentPath)
      }
      label={<span style={textStyle}>{folder}</span>}
      renderIcon={folderData.type === "folder" ? Folder : Document}
      isExpanded={folderData.type === "folder" && folderData.expanded}
      {...rest}
    >
      {folderData.type === "folder" &&
        Object.entries(content).map(([subFolder, subFolderData]) => (
          <DirentNode
            key={subFolder}
            folder={subFolder}
            folderData={subFolderData}
            parentPath={currentPath}
            unsavedChanges={unsavedChanges}
            setCurrentFile={setCurrentFile}
          />
        ))}
    </TreeNode>
  );
}
