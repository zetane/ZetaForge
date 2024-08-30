import { useContext } from "react";
import PromptMenu from "./PromptMenu";
import { Button } from "@carbon/react";
import { SelectedPromptContext } from "./SelectedPromptContext";

export default function Prompt({ children, index }) {
  const selectedPrompt = useContext(SelectedPromptContext);

  const isSelected = children === selectedPrompt.selectedPrompt;
  const borderStyle = isSelected ? " prompt-selected" : "";

  const handleClick = (e) => {
    e.preventDefault()
    selectedPrompt.setSelectedPrompt(children);
  };

  return (
    <div
      className={
        "prompt group relative flex flex-row justify-between rounded-lg" +
        borderStyle
      }
    >
      <Button
        onClick={handleClick}
        kind="ghost"
        className="min-w-0 max-w-none flex-1 rounded-lg disable-focus"
      >
        <span className="line-clamp-3 w-11/12 text-wrap">
          {children.prompt}
        </span>
      </Button>
      <div className="invisible absolute right-0 top-0 group-hover:visible">
        <PromptMenu index={index} prompt={children} />
      </div>
    </div>
  );
}
