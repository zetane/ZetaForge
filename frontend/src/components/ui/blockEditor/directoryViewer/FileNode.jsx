import { Document } from "@carbon/icons-react";
import { TreeNode } from "@carbon/react";
import { ConfirmModalContext } from "./ConfirmModalContext";
import ConfirmChangeFileModal from "./ConfirmChangeFileModal";
import useConfirmModal from "@/hooks/useConfirmModal";
import { useContext } from "react";
import { SelectedPromptContext } from "./SelectedPromptContext";

export default function FileNode({ tree, ...rest }) {
  const confirmModal = useConfirmModal(ConfirmModalContext);
  const selectedPrompt = useContext(SelectedPromptContext);

  const name = tree.name;
  const specialFiles = ["computations.py", "Dockerfile", "requirements.txt"];
  const isSpecialFile = specialFiles.includes(name);
  const classes = isSpecialFile ? "font-semibold" : "";

  const handleFileClick = async () => {
    await confirmModal.confirm(tree);
    selectedPrompt.unselect();
  };

  return (
    <ConfirmModalContext.Provider value={confirmModal}>
      <TreeNode
        className="file-explorer-node"
        onClick={handleFileClick}
        label={<span className={classes}>{name}</span>}
        renderIcon={Document}
        {...rest}
      />
      <ConfirmChangeFileModal />
    </ConfirmModalContext.Provider>
  );
}
