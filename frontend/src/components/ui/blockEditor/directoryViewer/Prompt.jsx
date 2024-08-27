import { useContext } from "react";
import PromptMenu from "./PromptMenu";
import { Button } from "@carbon/react";
import { SelectedPromptContext } from "./SelectedPromptContext";

export default function Prompt({ children, index }) {
  const selectedPrompt = useContext(SelectedPromptContext);
  const handleClick = () => {
    selectedPrompt.setSelectedPrompt(children)
  };

  return (
    <div className="prompt flex flex-row justify-between rounded-lg">
      <Button onClick={handleClick} kind="ghost" className="min-w-0 max-w-none flex-1 rounded-lg">
        <span className="line-clamp-3 text-wrap">{children.prompt}</span>
      </Button>
      <PromptMenu index={index} prompt={children}/>
    </div>
  );
}
