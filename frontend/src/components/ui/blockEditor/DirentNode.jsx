import { Document, Folder } from "@carbon/icons-react";
import { TreeNode } from "@carbon/react";
import { useState } from "react";

export default function DirentNode({
  parent,
  setCurrentFile,
  ...rest
}) {
  const name = parent.name;
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
    setCurrentFile({
      isSelected: true,
      ...parent,
    });

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

  return parent.children ? (
    <TreeNode
      key={name}
      onClick={handleFolderClick}
      label={<span style={textStyle}>{name}</span>}
      renderIcon={Folder}
      isExpanded={isExpanded}
      {...rest}
    >
      {parent.children.map((child) => (
        <DirentNode
          key={child.name}
          parent={child}
          setCurrentFile={setCurrentFile}
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
