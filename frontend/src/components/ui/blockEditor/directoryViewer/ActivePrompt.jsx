import { Button } from "@carbon/react";

export default function ActivePrompt({ children, onSelectActive }) {
  const handleClick = () => {
    onSelectActive();
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
