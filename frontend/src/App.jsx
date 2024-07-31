import ProviderInjector from "@/components/ProviderInjector";
import BlockEditorPanel from "@/components/ui/BlockEditorPanel";
import DrawflowWrapper from "@/components/ui/DrawflowWrapper";
import ForgeTheme from "@/components/ui/ForgeTheme";
import MainContent from "@/components/ui/MainContent";
import Navbar from "@/components/ui/Navbar";
import LibraryFetcher from "@/components/ui/library/LibraryFetcher";
import LibrarySwitcher from "@/components/ui/library/LibrarySwitcher";
import ModalWrapper from "@/components/ui/modal/ModalWrapper";
import ToastWrapper from "@/components/ui/ToastWrapper";
import WorkspaceTabs from "@/components/ui/WorkspaceTabs";
import WorkspaceFetcher from "@/components/ui/WorkspaceFetcher";
import SocketFetcher from "@/components/ui/SocketFetcher";

import "./styles/globals.scss";
import AnvilConfigurationsModal from "./components/ui/modal/AnvilConfigurationsModal";
import ClosableModal from "./components/ui/modal/ClosableModal";
import { useState, useEffect } from "react";
import axios from 'axios'
import { useAtom } from "jotai";
import { isPackaged} from "@/atoms/kubecontextAtom";
import { availableKubeContexts } from "@/atoms/kubecontextAtom";
import {Loading} from "@carbon/react"
import { ping } from "./client/anvil";
import { activeConfigurationAtom } from "./atoms/anvilConfigurationsAtom";

export default function App() {

  
  const [appIsPackaged, setIsPackaged] = useAtom(isPackaged)
  const [availableKubeContextsAtom, setAvailableKubeContexts] = useAtom(availableKubeContexts)
  const [configOpen, setConfigOpen] = useState(false)
  const [confirmationOpen, setConfirmationIsOpen] = useState(false)
  const [confirmationText, setConfirmationText] = useState([])
  const [errModalOpen, setErrModalOpen] = useState(false)
  const [errText, setErrText] = useState([])
  const [loading, setIsLoading] = useState(false)
  const [configuration] = useAtom(activeConfigurationAtom);

  
  useEffect( () => {
    const serverAddress = import.meta.env.VITE_EXPRESS
    const res = axios.get(`${serverAddress}/isPackaged`).then((response) => {
      const isPackaged = response.data
      console.log(response.data)
      setIsPackaged(response.data)
      
      if(isPackaged) {

        ping(configuration).then(res => {
          
          if(!res) {
            axios.get(`${serverAddress}/get-kube-contexts`).then((res) => {
                setAvailableKubeContexts(res.data)


                  axios.get(`${serverAddress}/get-anvil-config`).then(res => {
                  console.log("CHECK RES")
                  console.log(res)
                  console.log(res.data)
                  
            
                  const data = res.data
                  if(data.has_config) {
                    console.log("I SHOULD BE HERE ON THE RUN")
                    const config = data.config
                    const bucketPort = config.Local.BucketPort
                    const driver = config.Local.Driver
                    const serverPort = config.ServerPort
                    const context = config.KubeContext
                    if(config.IsLocal === true){
                    setConfirmationIsOpen(true)
                    const configText = ["Are you sure you want to run anvil with the following configurations?", "If you are using minikube driver, please make sure you've setted up your minikube cluster, and that it's running.", `HOST: 127.0.0.1`, `PORT: ${serverPort}` , `Context: ${context}`, `Driver: ${driver}`]
                    setConfirmationText(configText)
                    }
                  } else {
                    console.log("I MUST REACH HERE AT THE INITIAL RUN")
                    setConfigOpen(true)
                    setConfirmationIsOpen(false)
                  }
                }).catch(err => {
                  console.log("DEFINITELY NOT HERE")
                  setErrText(["Your local anvil did not started as expected. Please select a config", err.response?.data?.err, err.response?.data?.kubeErr])
                  setConfigOpen(true) //change this
                })
            }
            ).catch(err => {
              console.log(err.message)
            })
          }
        }).catch(err => {
          console.log("I AM NEVER HERE")
        })


      } else {
          //do nothing, because either pip is the controller, or the user runs on dev, hence they're responsible for running anvil, setting kubectl context etc... 
      }
  })
  }, [])
 
  const confirmSettings = async () => {
    setIsLoading(true)
    const serverAddress = import.meta.env.VITE_EXPRESS
    try{
      
      const res = await axios.post(`${serverAddress}/launch-anvil-from-config`)
      console.log(res)
      console.log("CONFIRMATION")
      setConfirmationIsOpen(false)
      setIsLoading(false)
    } catch(err) {
      console.log("CHECK THIS ERROR")
      console.log(err)
      setErrText([err.message])
      setErrModalOpen(true)
      setIsLoading(false)
    }
  }
  return (
    <ProviderInjector>
      <ForgeTheme>
        <Navbar>
          <WorkspaceTabs />
          <LibraryFetcher />
          <BlockEditorPanel />
        </Navbar>
        <LibrarySwitcher />
        <AnvilConfigurationsModal open={configOpen} onRequestClose={() => setConfigOpen(false)} isInitial={true}/>
        {/* {configOpen ? modalPopper(<AnvilConfigurationsModal/>) : <></>} */}

        {/* Confirmation */}
        <ClosableModal modalHeading="Would you like to run your anvil locally with your existing settings" size="md" primaryButtonText="Yes" secondaryButtonText="No" onRequestSubmit={confirmSettings} onRequestClose={() => {setConfirmationIsOpen(false); setConfigOpen(true)} } open={confirmationOpen}>
    <div className="flex flex-col gap-4 p-3">
          {confirmationText.map((error, i) => {
            console.log(confirmationText)
            return (
              <p key={"error-msg-" + i}>{error}</p>
            )
          })}
        </div>
        <Loading active={loading} />
      </ClosableModal>
      
      {/* Error */}
      <ClosableModal modalHeading="Following errors happened, please change your local config, or choose a cloud configuration" size="md" primaryButtonText="Yes" secondaryButtonText="No" passiveModal onRequestClose={() => {setErrModalOpen(false); setConfigOpen(true) }} open={errModalOpen}>
    <div className="flex flex-col gap-4 p-3">
          {errText.map((error, i) => {
            
            return (
              <p key={"error-msg-" + i}>{error}</p>
            )
          })}
        </div>
      </ClosableModal>

        <MainContent>
          <DrawflowWrapper />
        </MainContent>
        <ModalWrapper />
        <ToastWrapper />
        <SocketFetcher />
        <WorkspaceFetcher />
      </ForgeTheme>
    </ProviderInjector>
  );
}
