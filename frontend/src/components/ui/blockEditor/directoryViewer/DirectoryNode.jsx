import DirectoryEntryNode from "./DirectoryEntryNode";
import { Folder } from "@carbon/icons-react";
import { useState } from "react";
import { TreeNode } from "@carbon/react";

export default function DirectoryNode({ tree, isRoot, ...rest }) {
  const [isExpanded, setExpanded] = useState(isRoot ? true : false);

  const handleFolderClick = () => {
    setExpanded(!isExpanded);
  };

  return (
    <TreeNode
      className="file-explorer-node"
      id={tree.relativePath}
      onClick={handleFolderClick}
      label={<span>{tree.name}</span>}
      renderIcon={Folder}
      isExpanded={isExpanded}
      {...rest}
    >
      {tree.children.map((child) => (
        <DirectoryEntryNode key={child.name} tree={child} isRoot={false} />
      ))}
    </TreeNode>
  );
}
