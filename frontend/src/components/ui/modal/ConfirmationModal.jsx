import ClosableModal from "./ClosableModal";
import { useState } from "react";


export default function ConfirmationModal({confirmationText}) {
    const [confirmationOpen, setConfirmationIsOpen] = useState(false)
    const [errModalOpen, setErrModalIsOpen] = useState(false)
    const [confirmationText, setConfirmationText] = useState([])

    const confirmSettings = async () => {
    
        setIsLoading(true)
        if(configuration.anvil.host !== '127.0.0.1' && configuration.anvil.host !== 'localhost'){
          try{
            const res = await ping(configuration)
            setIsLoading(false)
            setConfirmationIsOpen(false)
    
          } catch(err) {
            setIsLoading(false)
            setErrMessage(["Can't Ping Cloud Anvil. Please check you settings"])
          }
        } else {
          const body = {
            host: configuration.anvil.host,
            anvilPort: configuration.anvil.port,
            KubeContext: currentKubeContext,
            s3Port: configuration.s3.port,
            driver: selectedDriver
          }
          try{
            const serverAddress = import.meta.env.VITE_EXPRESS
            const res = await axios.post(`${serverAddress}/launch-anvil`, body)
            setIsLoading(false)
            setConfirmationIsOpen(false)
    
          } catch(err) {
            
            setErrMessage([err.response?.data?.err, err.response?.data?.kubeErr])
            setErrModalIsOpen(true)
            setIsLoading(false)
            setConfirmationIsOpen(false)
          }
        }
      }

    <>
    <ClosableModal modalHeading="Are you sure you want to use this setting" size="md" primaryButtonText="Yes" secondaryButtonText="No" onRequestSubmit={confirmSettings} onRequestClose={() => setConfirmationIsOpen(false)} open={confirmationOpen}>
    <div className="flex flex-col gap-4 p-3">
          {confirmationText.map((error, i) => {
            return (
              <p key={"error-msg-" + i}>{error}</p>
            )
          })}
        </div>
        <Loading active={loading} />
      </ClosableModal>
    <ClosableModal modalHeading="Following errors occurred while launching anvil" size="md" passiveModal onRequestClose={() => setErrModalIsOpen(false)} open={errModalOpen}>
    <div className="flex flex-col gap-4 p-3">
        {errMessage.map((error, i) => {
          return (
            <p key={"error-msg-" + i}>{error}</p>
          )
        })}
      </div>
    </ClosableModal>
    </>
}