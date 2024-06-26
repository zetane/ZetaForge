import { useState } from "react";
import AnvilConfigurationForm from "./AnvilConfigurationForm";

export default function AnvilConfigurationsModal() {
  const [formModalOpen, setFormModalOpen] = useState(true);
  return (
    <ClosableModal modalHeading="Anvil Configurations" size="md" passiveModal>
      {formModalOpen ? (
        <ConfigTable onNew={() => setFormModalOpen(false)} />
      ) : (
        <AnvilConfigurationForm
          open={setFormModalOpen}
          onClose={() => setFormModalOpen(true)}
        />
      )}
    </ClosableModal>
  );
}


