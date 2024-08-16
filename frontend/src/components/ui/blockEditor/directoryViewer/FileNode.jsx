import { Document } from "@carbon/icons-react";
import { TreeNode } from "@carbon/react";

export default function FileNode({ tree, onSelectFile, ...rest }) {
  const name = tree.name;
  const specialFiles = ["computations.py", "Dockerfile", "requirements.txt"];
  const isSpecialFile = specialFiles.includes(name);
  const textStyle = isSpecialFile
    ? { color: "darkorange", paddingRight: "4px", paddingLeft: "4px" }
    : {};

  const handleFileClick = () => {
    onSelectFile(tree);
  };

  return (
    <TreeNode
      onClick={handleFileClick}
      label={<span style={textStyle}>{name}</span>}
      renderIcon={Document}
      {...rest}
    />
  );
}
