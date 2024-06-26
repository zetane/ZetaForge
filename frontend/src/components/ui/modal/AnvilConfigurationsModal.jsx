import { useState } from "react";
import AnvilConfigurationForm from "./AnvilConfigurationForm";
import ClosableModal from "./ClosableModal";
import AnvilConfigurationTable from "./AnvilConfigurationTable";

export default function AnvilConfigurationsModal() {
  const [formModalOpen, setFormModalOpen] = useState(true);
  return (
    <ClosableModal modalHeading="Anvil Configurations" size="md" passiveModal>
      {formModalOpen ? (
        <AnvilConfigurationTable onNew={() => setFormModalOpen(false)} />
      ) : (
        <AnvilConfigurationForm
          open={setFormModalOpen}
          onClose={() => setFormModalOpen(true)}
        />
      )}
    </ClosableModal>
  );
}


