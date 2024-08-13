import { Button } from "@carbon/react";
import { Copy } from "@carbon/icons-react";
import { ViewerCodeMirror } from "./CodeMirrorComponents";

export default function PromptViewer({ response, onAcceptPrompt }) {
  const handleAccept = () => {
    onAcceptPrompt();
  };

  return (
    <div className="relative min-h-0 flex-1">
      <ViewerCodeMirror code={response} />
      <div className="absolute right-2 top-2">
        <Button
          renderIcon={Copy}
          iconDescription="Accept"
          tooltipPosition="left"
          size="md"
          onClick={handleAccept}
        >
          Accept
        </Button>
      </div>
    </div>
  );
}
