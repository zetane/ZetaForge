import { Document, Folder } from "@carbon/icons-react";
import { TreeNode } from "@carbon/react";
import { useState } from "react";

export default function DirectoryEntryNode({
  parent,
  onSelectFile,
  ...rest
}) {
  const name = parent.name;
  const specialFiles = ["computations.py", "Dockerfile", "requirements.txt"];
  const isSpecialFile = specialFiles.includes(name);
  const textStyle = isSpecialFile
    ? { color: "darkorange", paddingRight: "4px", paddingLeft: "4px" }
    : {};

  const [isExpanded, setExpanded] = useState(true);// TODO decide default state

  const handleFolderClick = () => {
    setExpanded(!isExpanded);
  };

  const handleFileClick = () => {
    onSelectFile(parent);
  };

  return parent.children ? (
    <TreeNode
      id={parent.relativePath}
      onClick={handleFolderClick}
      label={<span style={textStyle}>{name}</span>}
      renderIcon={Folder}
      isExpanded={isExpanded}
      {...rest}
    >
      {parent.children.map((child) => (
        <DirectoryEntryNode
          key={child.name}
          parent={child}
          onSelectFile={onSelectFile}
        />
      ))}
    </TreeNode>
  ) : (
    <TreeNode
      onClick={handleFileClick}
      label={<span style={textStyle}>{name}</span>}
      renderIcon={Document}
      {...rest}
    />
  );
}
