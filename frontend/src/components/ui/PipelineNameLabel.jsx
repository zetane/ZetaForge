import { pipelineAtom } from "@/atoms/pipelineAtom";
import { TextInput } from "@carbon/react";
import { useState, useEffect } from "react";
import { Save } from "@carbon/icons-react"
import {Unsaved} from "@carbon/icons-react"
import { useImmerAtom } from "jotai-immer";
import {trpc} from "@/utils/trpc"
import { customAlphabet } from 'nanoid'

export default function PipelineNameLabel() {
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [editing, setEditing] = useState(false);

  const cacheQuery = trpc.getCachePath.useQuery();
  const cachePath = cacheQuery?.data || ""

  useEffect(() => {
    // TODO: Make this suck less
    if (!pipeline.name && cachePath != "") {
      setPipeline((draft) => {
        // Sending a path.sep from the server here
        // TODO: This logic will change because authoritative history
        // should be stored in the object store and we should
        // fetch the history stored in sqlite

        const name = `${cachePath}${pipeline.id}`
        draft.buffer = name
        draft.name = pipeline.id
      })

    }
  }, [pipeline.name, cachePath])

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
