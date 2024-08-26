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
      <Button onClick={handleClick} kind="ghost" className="max-w-full grow rounded-lg">
        {children.prompt}
      </Button>
      <PromptMenu index={index}/>
    </div>
  );
}
