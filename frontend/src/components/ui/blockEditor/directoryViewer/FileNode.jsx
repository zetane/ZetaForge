import { Document } from "@carbon/icons-react";
import { TreeNode } from "@carbon/react";
import { ConfirmModalContext } from "./ConfirmModalContext";
import ConfirmChangeFileModal from "./ConfirmChangeFileModal";
import useConfirmModal from "@/hooks/useConfirmModal";

export default function FileNode({ tree, ...rest }) {
  const confirmModal = useConfirmModal(ConfirmModalContext);

  const name = tree.name;
  const specialFiles = ["computations.py", "Dockerfile", "requirements.txt"];
  const isSpecialFile = specialFiles.includes(name);
  const textStyle = isSpecialFile
    ? { color: "darkorange", paddingRight: "4px", paddingLeft: "4px" }
    : {};

  const handleFileClick = () => {
    confirmModal.confirm(tree);
  };

  return (
    <ConfirmModalContext.Provider value={confirmModal}>
      <TreeNode
        onClick={handleFileClick}
        label={<span style={textStyle}>{name}</span>}
        renderIcon={Document}
        {...rest}
      />
      <ConfirmChangeFileModal/>
    </ConfirmModalContext.Provider>
  );
}

