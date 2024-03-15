import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import {distinctIdAtom} from '@/atoms/distinctIdAtom'
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";
import { trpc } from "@/utils/trpc"
import { useImmerAtom } from 'jotai-immer'
import mixpanel from '@/components/mixpanel'

export default function SavePipelineButton() {
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [distinctId, setDistinctId] = useImmerAtom(distinctIdAtom)
  
  
  const savePipeline = trpc.savePipeline.useMutation();
  
  const getDistinctId = trpc.getDistinctId.useMutation();
  
 

  

  const handleClick = async (editor, pipeline) => {
    const pipelineSpecs = editor.convert_drawflow_to_block(pipeline.name);
    // If a pipeline is loaded, pipeline.path will be set to the load path
    // If it isn't set, electron will pop a file picker window
    // The response from the server after saving will contain that new path
    // TODO: the pipelineAtom data and these fields are redundant
    // They should be consolidated
    pipelineSpecs['sink'] = pipeline.path ? pipeline.path : pipeline.buffer
    pipelineSpecs['build'] = pipeline.path ? pipeline.path : pipeline.buffer
    pipelineSpecs['name'] = pipeline.name
    const saveData = {
      specs: pipelineSpecs, 
      name: pipeline.name, 
      buffer: pipeline.buffer,
      writePath: pipeline.path
    }
    
    const response = await savePipeline.mutateAsync(saveData)
    
    let data = distinctId?.distinctId
    
    if(data === "0" || data === undefined) {
        
        const res = await getDistinctId.mutateAsync({distinctId: "0"})
        
        data = res.distinctId
        
        setDistinctId( (draft) =>{
          draft.distinctId = data
        })
    }

    const {dirPath, specs} = response
    

    
    
    
    setPipeline((draft) => {
      draft.saveTime = Date.now()
      if (specs) {
        draft.name = specs.split(".")[0]
      }
      if (dirPath) {
        draft.path = dirPath
      }
    })

    try {
      
      mixpanel.track('Save Pipeline', {
        'distinct_id': data,
      })
      
    } catch(error) {
      //no logs, just ignore
    }
  };

  return (
    <div>
      <HeaderMenuItem onClick={() => handleClick(editor, pipeline)}>Save</HeaderMenuItem>
    </div>
  );
}
