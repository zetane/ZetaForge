import { pipelineAtom } from "@/atoms/pipelineAtom";
import { TextInput } from "@carbon/react";
import { useState } from "react";
import { Save } from "@carbon/icons-react"
import {Unsaved} from "@carbon/icons-react"
import { useImmerAtom } from "jotai-immer";

export default function PipelineNameLabel() {
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [editing, setEditing] = useState(false);

  const updatePipeline = (e) => {
    setPipeline((draft) => {
      draft.name = e.target.value
    })
  };

  const enableEditing = (e) => {
    setEditing(true);
  };

  const disableEditing = (e) => {
    setEditing(false);
  };

  let saveIcon = null;
  if (pipeline.saveTime) {
    const niceTime = new Date(pipeline.saveTime).toString()
    saveIcon = (<Save className="pr-2" size={30} title={niceTime} />)
  } else {
    saveIcon = (<Unsaved className="pr-2" size={30} title="Not saved" />)
  }

  return (
    <>
      {saveIcon}
      <div>
        <TextInput
          value={pipeline.name}
          onChange={updatePipeline}
          readOnly={!editing}
          onMouseEnter={enableEditing}
          onBlurCapture={disableEditing}
          type="string"
          size="sm"
          id="pipelineName"
        />
      </div>
    </>
  );
}
