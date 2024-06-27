import { useState } from "react";
import AnvilConfigurationForm from "./AnvilConfigurationForm";
import ClosableModal from "./ClosableModal";
import AnvilConfigurationTable from "./AnvilConfigurationTable";
import {
  addConfigurationAtom,
  editConfigurationAtom,
} from "@/atoms/anvilConfigurationsAtom";
import { useAtom } from "jotai";

const CONFIGURATION_TABLE_TITLE = "Anvil Configurations";
const NEW_CONFIGURATION_TITLE = "New Configuration";
const EDIT_CONFGURATION_TITLE = "Edit Configuration";
export default function AnvilConfigurationsModal() {
  const [, addConfiguration] = useAtom(addConfigurationAtom);
  const [, editConfiguration] = useAtom(editConfigurationAtom);
  const [formOpen, setFormOpen] = useState(true);
  const [initialConfiguration, setInitialConfiguration] = useState(undefined);
  const [handleSave, setHandleSave] = useState(undefined);
  const [title, setTitle] = useState(CONFIGURATION_TABLE_TITLE);

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

  return (
    <ClosableModal modalHeading={title} size="md" passiveModal>
      {formOpen ? (
        <AnvilConfigurationForm
          onCancel={handleCancel}
          onSave={handleSave}
          initialConfiguration={initialConfiguration}
        />
      ) : (
        <AnvilConfigurationTable onNew={handleNew} onEdit={handleEdit} />
      )}
    </ClosableModal>
  );
}

