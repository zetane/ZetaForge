import { pipelineAtom } from "@/atoms/pipelineAtom";
import { TextInput } from "@carbon/react";
import { useState, useMemo } from "react";
import { Save } from "@carbon/icons-react"
import { Unsaved } from "@carbon/icons-react"
import { useImmerAtom } from "jotai-immer";
import { executionAtom } from "@/atoms/executionAtom";

export default function PipelineNameLabel() {
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [execution, _] = useImmerAtom(executionAtom)
  const [editing, setEditing] = useState(false);

  let saveIcon = null;
  let saveStyles = { marginLeft: '5px;' }
  if (pipeline.saveTime) {
    const niceTime = new Date(pipeline.saveTime).toString()
    saveIcon = (<Save className="pl-2" size={30} title={niceTime} />)
  } else {
    saveIcon = (<Unsaved className="pl-2" size={30} title="Not saved" />)
  }


  
  console.log(pipeline)

  return (
    <>
      <div>
        <TextInput size="sm" 
          disabled={true}
          readOnly={true} 
          placeholder={pipeline.name}
          defaultValue={pipeline.name}
          >
        </TextInput>
      </div>
    </>
  );
}
