import { Button } from "@carbon/react";
import { useContext } from "react";
import { SelectedPromptContext } from "./SelectedPromptContext";

export default function ActivePrompt({ children }) {
  const selectedPrompt = useContext(SelectedPromptContext)
  const handleClick = () => {
    selectedPrompt.setSelectedPrompt(undefined); 
  };

  return (
    <div className="prompt-active border-solid border-2 flex rounded-lg">
      <Button
        onClick={handleClick}
        kind="ghost"
        className="max-w-full grow rounded-lg"
      >
        {children}
      </Button>
    </div>
  );
}
