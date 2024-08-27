import { useContext } from "react";
import PromptMenu from "./PromptMenu";
import { Button } from "@carbon/react";
import { SelectedPromptContext } from "./SelectedPromptContext";

export default function Prompt({ children, index }) {
  const selectedPrompt = useContext(SelectedPromptContext);
  const handleClick = () => {
    selectedPrompt.setSelectedPrompt(children);
  };

  return (
    <div className="prompt flex flex-row justify-between rounded-lg relative group">
      <Button
        onClick={handleClick}
        kind="ghost"
        className="min-w-0 max-w-none flex-1 rounded-lg"
      >
        <span className="line-clamp-3 text-wrap w-11/12">{children.prompt}</span>
      </Button>
      <div className="absolute right-0 top-0 invisible group-hover:visible">
        <PromptMenu index={index} prompt={children} />
      </div>
    </div>
  );
}
