import PromptMenu from "./PromptMenu";

export default function Prompt({ children, response, onSelectPrompt}) {
  return (
    <div className="relative min-h-12 p-3 rounded-lg align-middle prompt">
      <div className="absolute top-0 right-0">
        <PromptMenu response={response} onSelectPrompt={onSelectPrompt}  />
      </div>
      {children}
    </div>
  );
}

