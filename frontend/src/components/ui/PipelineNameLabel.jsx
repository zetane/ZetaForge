import { pipelineAtom } from "@/atoms/pipelineAtom";
import { TextInput } from "@carbon/react";
import { useState, useEffect } from "react";
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
  let saveStyles = { marginLeft: '5px;' }
  if (pipeline.saveTime) {
    const niceTime = new Date(pipeline.saveTime).toString()
    saveIcon = (<Save className="pl-2" size={30} title={niceTime} />)
  } else {
    saveIcon = (<Unsaved className="pl-2" size={30} title="Not saved" />)
  }

  return (
    <>
      <div>
        <TextInput
          value={pipeline.name}
          disabled={true}
          type="string"
          size="sm"
          id="pipelineName"
        />
      </div>
    </>
  );
}
