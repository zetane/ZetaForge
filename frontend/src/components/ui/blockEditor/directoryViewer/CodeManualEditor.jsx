import { Button} from "@carbon/react";
import { Save } from "@carbon/icons-react";
import { EditorCodeMirror } from "./CodeMirrorComponents";

export default function CodeManualEditor({ code, onChange, onSave }) {
  const handleChange = (value) => {
    onChange(value);
  };

  const handleSave = () => {
    onSave();
  };


  return (
    <div className="relative min-h-0 flex-1">
      <EditorCodeMirror
        code={code}
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
        />
      </div>
    </div>
  );
}
