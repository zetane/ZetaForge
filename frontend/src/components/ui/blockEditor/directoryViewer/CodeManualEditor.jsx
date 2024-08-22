import { Button} from "@carbon/react";
import { Save } from "@carbon/icons-react";
import { EditorCodeMirror } from "./CodeMirrorComponents";
import { useState } from "react";

export default function CodeManualEditor({ code, hasPendingChanges, onChange, onSave }) {
  const [isLoading, setIsLoading] = useState(false)

  const saveDisabled = isLoading || !hasPendingChanges

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
      <div className="absolute right-5 top-5">
        <Button
          renderIcon={Save}
          iconDescription="Save code"
          tooltipPosition="left"
          hasIconOnly
          size="md"
          onClick={handleSave}
          disabled={saveDisabled}
        />
      </div>
    </div>
  );
}
