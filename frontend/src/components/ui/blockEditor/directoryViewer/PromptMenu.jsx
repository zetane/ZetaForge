import { OverflowMenu, OverflowMenuItem } from "@carbon/react";
import { Delete } from "@carbon/icons-react";
import { useContext } from "react";
import { ChatHistoryContext } from "./ChatHistoryContext";

export default function PromptMenu({ index }) {
  const chatHistory = useContext(ChatHistoryContext)

  const handleDelete = async () => {
    chatHistory.deletePrompt(index)
  };

  return (
    <OverflowMenu
      className="rounded-lg"
      aria-label="overflow-menu"
      data-floating-menu-container="cds--header-panel"
      flipped
    >
      <OverflowMenuItem itemText="Delete" isDelete onClick={handleDelete}>
        <Delete/>
      </OverflowMenuItem>
    </OverflowMenu>
  );
}

