import { defaultAnvilConfiguration, userAnvilConfigurations, addConfiguration, removeConfiguration } from "@/atoms/anvilHost";
import { Button, IconButton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSelectRow, TableToolbar, TableToolbarContent, TextInput } from "@carbon/react";
import { useAtom } from "jotai";
import ClosableModal from "./ClosableModal";
import { Add, TrashCan } from "@carbon/icons-react";
import { useState } from "react";

export default function AnvilConfigModal() {
  const [defaultConfiguration] = useAtom(defaultAnvilConfiguration)
  const [userConfigurations] = useAtom(userAnvilConfigurations)

  return (<ClosableModal
    modalHeading="Anvil Configurations"
    primaryButtonText="Save"
    secondaryButtonText="Cancel"
    size="md"
  >
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader />
          <TableHeader>
            Name
          </TableHeader>
          <TableHeader>
            Host
          </TableHeader>
          <TableHeader>
            Anvil Port
          </TableHeader>
          <TableHeader>
            S3 Port
          </TableHeader>
          <TableHeader />
        </TableRow>
      </TableHead>
      <TableBody>
        <ConfigRows configurations={[defaultConfiguration]} />
        <ConfigRows configurations={userConfigurations} deletable />
        <AddRow />
      </TableBody>
    </Table>
  </ClosableModal>
  )
}

function ConfigRows({ configurations, deletable }) {
  const [, removeConfig] = useAtom(removeConfiguration)

  function handleRemoveConfiguration(index) {
    removeConfig(index)
  }

  return configurations.map((c, i) => <TableRow key={i}>
    <TableSelectRow radio />
    <ConfigCells configuration={c} />
    {deletable ? <TableCell><IconButton onClick={() => handleRemoveConfiguration(i)} kind="ghost" size="sm"><TrashCan /></IconButton></TableCell> : <TableCell />}
  </TableRow>)
}

function ConfigCells({ configuration }) {
  return Object.keys(configuration).map((k) => <TableCell key={k}>{configuration[k]}</TableCell>)
}

function AddRow() {
  const [, addConfig] = useAtom(addConfiguration)
  const [config, setConfig] = useState({
    name: "",
    host: "",
    anvilPort: "",
    s3Port: "",
  })

  function handleAddConfiguration() {
    console.log(config)
    addConfig(config)
  }

  function handleInputChange(key, value) {
    setConfig((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  return <TableRow>
    <TableCell />
    <TableCell><TextInput value={config.name} onChange={(e) => handleInputChange("name", e.target.value)} /></TableCell>
    <TableCell><TextInput value={config.host} onChange={(e) => handleInputChange("host", e.target.value)} /></TableCell>
    <TableCell><TextInput value={config.anvilPort} onChange={(e) => handleInputChange("anvilPort", e.target.value)} /></TableCell>
    <TableCell><TextInput value={config.s3Port} onChange={(e) => handleInputChange("s3Port", e.target.value)} /></TableCell>
    <TableCell><IconButton onClick={handleAddConfiguration} kind="ghost" size="sm"><Add /></IconButton></TableCell>
  </TableRow>
}
