import { useImmerAtom } from "jotai-immer";
import axios from "axios";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@carbon/react";

export default function GetEndpointButton({modalPopper, children, action}) {
    const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);

    const styles = {
        margin: '5px',
    };

    const mutation = useMutation({
        mutationFn: async (uuid) => {
            return axios.get(`${import.meta.env.VITE_EXECUTOR}/pipeline/${uuid}/list`)
        },
    })

    const endpoint = async (pipeline) => {
        const res = await mutation.mutateAsync(pipeline.id)
        if (res.status === 200) {
            if (res.data !== null) {
                console.log(`${import.meta.env.VITE_EXECUTOR}/pipeline/${pipeline.id}/${res.data[0].Hash}/execute`)
            } else {
                console.log("This pipeline has not been deployed")
            }
        } else {
            console.log("An error occured.")
        }
    }

    return (
    <>
        <Button style={styles} size="sm" onClick={() => { endpoint(pipeline) }}>
        <span>{ action }</span>
        { children }
        </Button>

        <ClosableModal
            modalHeading="The following error(s) occurred:"
            passiveModal={true}
            open={isOpen}
            onRequestClose={() => setIsOpen(false)}
        >
        <div className="flex flex-col gap-4 p-3">
          {validationErrorMsg.map((error, i) => {
            return (
              <p key={"error-msg-"+i}>{error}</p>
            )
          })}
        </div>
      </ClosableModal>
    </>
    );
}