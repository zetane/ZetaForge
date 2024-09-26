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
  isPackaged,
  choosenKubeContexts,
  chosenDriver,
  availableKubeContexts,
} from "@/atoms/kubecontextAtom";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import axios from "axios";
import AnvilLauncherStatus from "../AnvilLauncherStatus";

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
  const [appIsPackaged, setAppIsPackaged] = useState(false);
  const [confirmationOpen, setConfirmationIsOpen] = useState(false);
  const [configuration] = useAtom(activeConfigurationAtom);
  const [confirmationText, setConfirmationText] = useState([]);
  const [currentKubeContext, setCurrentKubeContext] =
    useAtom(choosenKubeContexts);
  const [selectedDriver] = useAtom(chosenDriver);
  const [errModalOpen, setErrModalIsOpen] = useState(false);
  const [errMessage, setErrMessage] = useState([]);
  const [userDriver] = useAtom(chosenDriver);
  const [logViewerOpen, SystemLogViewerOpen] = useState(false);
  const [loading, setIsLoading] = useState(false);
  const [_, setAvailableKubeContexts] = useAtom(availableKubeContexts);

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
    const serverAddress = import.meta.env.VITE_EXPRESS;
    const res = axios.get(`${serverAddress}/isPackaged`).then((response) => {
      setAppIsPackaged(response.data);
    });

    axios.get(`${serverAddress}/get-kube-contexts`).then((res) => {
      setAvailableKubeContexts(res.data);
    });
  }, []);

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
    SystemLogViewerOpen(true);
    setConfirmationIsOpen(false);

    const body = {
      host: configuration.anvil.host,
      anvilPort: configuration.anvil.port,
      KubeContext: currentKubeContext,
      s3Port: configuration.s3.port,
      driver: selectedDriver,
    };
    try {
      setIsLoading(true);
      const serverAddress = import.meta.env.VITE_EXPRESS;
      const res = await axios.post(`${serverAddress}/launch-anvil`, body);
      setIsLoading(false);
    } catch (err) {
      // handled in system logs
      setIsLoading(false);
    }
  };
  const saveAndRelaunch = () => {
    if (
      configuration.anvil.host === "localhost" ||
      configuration.anvil.host === "127.0.0.1"
    ) {
      setConfirmationText([
        "Are you sure you want to launch local anvil server with the following settings?",
        `ANVIL HOST: ${configuration.anvil.host}`,
        `ANVIL PORT: ${configuration.anvil.port}`,
        `Kubernetes Context: ${currentKubeContext}`,
        `Driver: ${userDriver}`,
      ]);
      setConfirmationIsOpen(true);
    }
  };

  let disabled = true;

  if (!appIsPackaged) {
    disabled = false;
  } else {
    if (
      (configuration?.anvil.host === "localhost" ||
        configuration.anvil.host === "127.0.0.1") &&
      userDriver !== "" &&
      currentKubeContext !== ""
    ) {
      disabled = false;
    } else {
      disabled = true;
    }
  }

  const closeConfirmation = () => {
    setConfirmationIsOpen(false);
  };

  const className = formOpen ? "anvil-config-modal-formOpen" : "anvil-config-modal"
  return (
    <>
      <ClosableModal
        className={className}
        modalHeading={title}
        size="lg"
        primaryButtonText={"Save & Relaunch"}
        primaryButtonDisabled={
          disabled || formOpen || loading || props?.initialLoading
        }
        onRequestSubmit={saveAndRelaunch}
        modalType="Anvil Config"
        passiveModal={formOpen}
        {...(props?.isInitial
          ? { open: props.open, onRequestClose: props.onRequestClose }
          : {})}
      >
        {formOpen ? (
          <AnvilConfigurationForm
            onCancel={handleCancel}
            onSave={handleSave}
            initialConfiguration={initialConfiguration}
          />
        ) : (
          <div className="anvil-config-table">
            <AnvilConfigurationTable onNew={handleNew} onEdit={handleEdit} />
          </div>
        )}
      </ClosableModal>

      <AnvilLauncherStatus
        confirmationHeader="Are you sure you want to use this setting?"
        confirmSettings={confirmSettings}
        confirmationClose={closeConfirmation}
        confirmationOpen={confirmationOpen}
        confirmationMessage={confirmationText}
        errorHeader="Following errors occurred while launching anvil"
        errorClose={() => setErrModalIsOpen(false)}
        errorOpen={errModalOpen}
        errorMessage={errMessage}
        logViewerTitle={"System Logs"}
        logViewerOpen={logViewerOpen}
        logViewerClose={() => {
          SystemLogViewerOpen(false);
        }}
      />
    </>
  );
}
