import { Document, Folder } from "@carbon/icons-react";
import { TreeNode } from "@carbon/react";
import { useState } from "react";

export default function DirentNode({
  name,
  path,
  children,
  setCurrentFile,
  ...rest
}) {
  const specialFiles = ["computations.py", "Dockerfile", "requirements.txt"];
  const isSpecialFile = specialFiles.includes(name);
  const textStyle = isSpecialFile
    ? { color: "darkorange", paddingRight: "4px", paddingLeft: "4px" }
    : {};

  const [isExpanded, setExpanded] = useState(true);

  const handleFolderClick = () => {
    setExpanded(!isExpanded);
  };
  // const onToggle = (folderPath) => {
  //   setFileSystem((prevFileSystem) => {
  //     const toggleFolder = (pathSegments, fileSystem) => {
  //       if (!fileSystem || typeof fileSystem !== "object") {
  //         return fileSystem;
  //       }
  //
  //       const [currentSegment, ...remainingSegments] = pathSegments;
  //       if (!fileSystem[currentSegment]) {
  //         console.error(
  //           `No such folder: ${currentSegment} in path ${folderPath}`,
  //         );
  //         return fileSystem;
  //       }
  //
  //       if (!remainingSegments.length) {
  //         return {
  //           ...fileSystem,
  //           [currentSegment]: {
  //             ...fileSystem[currentSegment],
  //             expanded: !fileSystem[currentSegment].expanded,
  //           },
  //         };
  //       } else {
  //         return {
  //           ...fileSystem,
  //           [currentSegment]: {
  //             ...fileSystem[currentSegment],
  //             content: toggleFolder(
  //               remainingSegments,
  //               fileSystem[currentSegment].content,
  //             ),
  //           },
  //         };
  //       }
  //     };
  //     let relPath = folderPath.replaceAll("\\", "/");
  //
  //     return toggleFolder(relPath.split("/"), prevFileSystem);
  //   });
  // };

  const handleFileClick = () => {
    setCurrentFile(path);
    // if (unsavedChanges) {
    //   setPendingFile(filePath);
    //   setIsModalOpen(true);
    // } else {
    //   if (filePath.endsWith(".html")) {
    //     const fileContent = folderData.content;
    //     const blob = new Blob([fileContent], { type: "text/html" });
    //     const url = URL.createObjectURL(blob);
    //     window.open(url, "_blank");
    //   } else {
    //     setCurrentFile({ path: filePath, content: folderData.content });
    //   }
    // }
  };

  return children ? (
    <TreeNode
      key={name}
      onClick={handleFolderClick}
      label={<span style={textStyle}>{name}</span>}
      renderIcon={Folder}
      isExpanded={isExpanded}
      {...rest}
    >
      {children.map((child) => (
        <DirentNode
          name={child.name}
          path={child.path}
          children={child.children}
          setCurrentFile={setCurrentFile}
          // parentPath={currentPath}
          // unsavedChanges={unsavedChanges}
          // setCurrentFile={setCurrentFile}
        />
      ))}
    </TreeNode>
  ) : (
    <TreeNode
      key={name}
      onClick={handleFileClick}
      label={<span style={textStyle}>{name}</span>}
      renderIcon={Document}
      {...rest}
    />
  );
}
