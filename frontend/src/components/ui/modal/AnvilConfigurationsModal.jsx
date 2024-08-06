import { useEffect, useState } from "react";
import AnvilConfigurationForm from "./AnvilConfigurationForm";
import ClosableModal from "./ClosableModal";
import AnvilConfigurationTable from "./AnvilConfigurationTable";
import {
  addConfigurationAtom,
  editConfigurationAtom,
} from "@/atoms/anvilConfigurationsAtom";
import { useAtom } from "jotai";
import {
  Tab,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
  Loading
} from "@carbon/react";
import KubecontextModal from "./KubecontextModal";
import { isPackaged, choosenKubeContexts, choosenDriver } from "@/atoms/kubecontextAtom";
import { activeConfigurationAtom} from "@/atoms/anvilConfigurationsAtom";
import axios from 'axios'
import { ping } from "@/client/anvil";

const CONFIGURATION_TABLE_TITLE = "Anvil Configurations";
const NEW_CONFIGURATION_TITLE = "New Configuration";
const EDIT_CONFGURATION_TITLE = "Edit Configuration";


export default function AnvilConfigurationsModal(props) {
  const [, addConfiguration] = useAtom(addConfigurationAtom);
  const [, editConfiguration] = useAtom(editConfigurationAtom);
  const [formOpen, setFormOpen] = useState(false);
  const [initialConfiguration, setInitialConfiguration] = useState(undefined);
  const [handleSave, setHandleSave] = useState(undefined);
  const [title, setTitle] = useState(CONFIGURATION_TABLE_TITLE);
  const [appIsPackaged, setAppIsPackaged] = useState(false)
  const [confirmationOpen, setConfirmationIsOpen] = useState(false)
  const [configuration] = useAtom(activeConfigurationAtom);
  const [confirmationText, setConfirmationText] = useState([])
  const [currentKubeContext, setCurrentKubeContext] = useAtom(choosenKubeContexts)
  const [selectedDriver] = useAtom(choosenDriver)
  const [errModalOpen, setErrModalIsOpen] = useState(false)
  const [errMessage, setErrMessage] = useState([])
  const [loading, setIsLoading] = useState(false)
  const [userDriver] = useAtom(choosenDriver) 

  function handleNew() {
    setInitialConfiguration(undefined);
    setHandleSave(() => (newConfiguration) => {
      addConfiguration(newConfiguration);
      setTitle(CONFIGURATION_TABLE_TITLE);
      setFormOpen(false);
    });
    setTitle(NEW_CONFIGURATION_TITLE);
    setFormOpen(true);
  }

  useEffect(() => {
    const serverAddress = import.meta.env.VITE_EXPRESS
    const res = axios.get(`${serverAddress}/isPackaged`).then((response) => {
      console.log("CHECK HERE")
      console.log(response.data)
      setAppIsPackaged(response.data)
    }
  )}, [])


  function handleEdit(userConfigurationIndex, configuration) {
    setInitialConfiguration(configuration);
    setHandleSave(() => (newConfiguration) => {
      editConfiguration([userConfigurationIndex, newConfiguration]);
      setTitle(CONFIGURATION_TABLE_TITLE);
      setFormOpen(false);
    });
    setTitle(EDIT_CONFGURATION_TITLE);
    setFormOpen(true);
  }

  function handleCancel() {
    setTitle(CONFIGURATION_TABLE_TITLE);
    setFormOpen(false);
  }

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
  const saveAndRelaunch = () => {
    if(configuration.anvil.host === 'localhost' || configuration.anvil.host === '127.0.0.1'){
      setConfirmationText(["Are you sure you want to launch local anvil server with the following settings?", `ANVIL HOST: ${configuration.anvil.host}`, `ANVIL PORT: ${configuration.anvil.port}`, `Kubernetes Context: ${currentKubeContext}`, `Driver: ${userDriver}`])
      setConfirmationIsOpen(true)
    } else {
      setConfirmationText(["Are you sure you want to use remote anvil server with the following settings?", `ANVIL HOST: ${configuration.anvil.host}`, `ANVIL PORT: ${configuration.anvil.port}` ])
      setConfirmationIsOpen(true)
    }
  }
  
  let disabled = false
  if(appIsPackaged === false) {
    disabled=true

  } else {
    if( (configuration?.anvil.host !== 'localhost' && configuration?.anvil.host !== '127.0.0.1') || ((configuration?.anvil?.host === 'localhost' || configuration?.anvil?.host === '127.0.0.1') && (userDriver === '' || currentKubeContext === '')) ){
      disabled = true
    }
  }

  let disableTab = false 
  console.log("APP MUST BE PACKAGEDDDD")
  console.log(appIsPackaged)
  if(appIsPackaged === false) {
    console.log("I SHOULD NEVER BE HEREEEEEE")
    disableTab = true
  } else {
    if(configuration?.anvil.host === 'localhost' || configuration?.anvil.host === '127.0.0.1') {
      disableTab = false
    } else{
      disableTab = true
    }
  }

  
  return (
    <>
    {props?.isInitial ? <ClosableModal className="anvil-config-container" modalHeading="Anvil Configurations" size="md"  initialLaunch={false}  primaryButtonText={(configuration.anvil.host === '127.0.0.1' || configuration.anvil.host === 'localhost') ? "Save & Relaunch" : "Ping Cloud"}   primaryButtonDisabled={disabled} onRequestSubmit={saveAndRelaunch} modalType="Anvil Config" onRequestClose={props.onRequestClose} open={props.open}>
      <Tabs>
        <TabList>
          <Tab>
            Anvil Configurations
          </Tab>
         
          <Tab disabled={disableTab} >
          Set KubeContext
          </Tab> 
        </TabList>
        <TabPanels>
          <TabPanel>
          {formOpen ? (
        <AnvilConfigurationForm
          onCancel={handleCancel}
          onSave={handleSave}
          initialConfiguration={initialConfiguration}
        />
      ) : (
        <AnvilConfigurationTable onNew={handleNew} onEdit={handleEdit} />
      )}
          </TabPanel>
          <TabPanel>
            <div className="context-table-container">
            <KubecontextModal isPackaged={appIsPackaged} initialLaunch={false}/>
            </div>
          </TabPanel>
        </TabPanels>      
      </Tabs>
    </ClosableModal> : 
    <ClosableModal className="anvil-config-container" modalHeading="Anvil Configurations" size="md"  initialLaunch={false}  primaryButtonText={(configuration.anvil.host === '127.0.0.1' || configuration.anvil.host === 'localhost') ? "Save & Relaunch" : "Ping Cloud"}   primaryButtonDisabled={disabled} onRequestSubmit={saveAndRelaunch} modalType="Anvil Config">
      <Tabs>
        <TabList>
          <Tab>
            Anvil Configurations
          </Tab>
          <Tab disabled={disableTab} >
          Set KubeContext
          </Tab> 
        </TabList>
        <TabPanels>
          <TabPanel>
          {formOpen ? (
        <AnvilConfigurationForm
          onCancel={handleCancel}
          onSave={handleSave}
          initialConfiguration={initialConfiguration}
        />
      ) : (
        <AnvilConfigurationTable onNew={handleNew} onEdit={handleEdit} />
      )}
          </TabPanel>
          <TabPanel>
            <div className="context-table-container">
            <KubecontextModal isPackaged={appIsPackaged} initialLaunch={false}/>
            </div>
          </TabPanel>
        </TabPanels>      
      </Tabs>
    </ClosableModal>}
    
    <ClosableModal modalHeading="Are you sure you want to use this setting?" size="md" primaryButtonText="Yes" secondaryButtonText="No" onRequestSubmit={confirmSettings} onRequestClose={() => setConfirmationIsOpen(false)} open={confirmationOpen}>
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
  );
}
