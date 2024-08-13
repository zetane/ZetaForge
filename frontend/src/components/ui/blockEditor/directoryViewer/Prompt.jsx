import PromptMenu from "./PromptMenu";
import { Button } from "@carbon/react";

export default function Prompt({ children, response, onSelectPrompt }) {
  const handleClick = () => {
    onSelectPrompt(response);
  };

  return (
    <div className="prompt flex flex-row justify-between rounded-lg">
      <Button onClick={handleClick} kind="ghost" className="max-w-full grow">
        {children}
      </Button>
      <PromptMenu response={response} />
    </div>
  );
}
