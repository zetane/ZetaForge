import { Button} from "@carbon/react";
import { Save } from "@carbon/icons-react";
import { EditorCodeMirror } from "./CodeMirrorComponents";
import { useState } from "react";

export default function CodeManualEditor({ code, onChange, onSave }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (value) => {
    onChange(value);
  };

  const handleSave = async () => {
    setIsLoading(true)
    await onSave();
    setIsLoading(false);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <EditorCodeMirror
        code={code ?? ""}
        onChange={handleChange}
      />
      <div className="absolute right-2 top-2">
        <Button
          renderIcon={Save}
          iconDescription="Save code"
          tooltipPosition="left"
          hasIconOnly
          size="md"
          onClick={handleSave}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
