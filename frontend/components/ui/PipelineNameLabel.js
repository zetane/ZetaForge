import { pipelineName } from "@/atoms/pipelineAtom";
import { TextInput } from "@carbon/react";
import { useAtom } from "jotai";
import { useState } from "react";

export default function PipelineNameLabel() {
  const [name, setName] = useAtom(pipelineName);
  const [editing, setEditing] = useState(false);

  const setPipelineName = (e) => {
    setName(e.target.value);
  };

  const enableEditing = (e) => {
    setEditing(true);
  };

  const disableEditing = (e) => {
    setEditing(false);
  };

  return (
    <div className="pt-2">
      <TextInput
        value={name}
        onChange={setPipelineName}
        readOnly={!editing}
        onMouseEnter={enableEditing}
        onBlurCapture={disableEditing}
        type="string"
        size="sm"
        id="pipelineName"
      />
    </div>
  );
}
