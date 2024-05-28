import { defaultAnvilConfiguration, userAnvilConfigurations, addConfiguration, removeConfiguration, activeIndex } from "@/atoms/anvilHost";
import { IconButton, NumberInput, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSelectRow, TextInput } from "@carbon/react";
import { useAtom } from "jotai";
import ClosableModal from "./ClosableModal";
import { Add, TrashCan } from "@carbon/icons-react";
import { useState } from "react";

export default function AnvilConfigModal() {
  const [defaultConfiguration] = useAtom(defaultAnvilConfiguration)
  const [userConfigurations] = useAtom(userAnvilConfigurations)

  const defaultRows = [defaultConfiguration].map(c => ({
    configuration: c,
    deletable: false
  }))
  const userRows = userConfigurations.map((c, i) => ({
    configuration: c,
    removeable: true,
    removeIndex: i
  }))
  const rows = [...defaultRows, ...userRows].map((r, i) => ({
    ...r,
    selectIndex: i
  }))

  return (<ClosableModal
    modalHeading="Anvil Configurations"
    size="md"
    passiveModal
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
        <ConfigRows rows={rows} />
        <AddRow />
      </TableBody>
    </Table>
  </ClosableModal>
  )
}

function ConfigRows({ rows }) {
  return rows.map((r, i) => <ConfigRow key={i} {...r} />)
}

function ConfigRow({ configuration, removeable, removeIndex, selectIndex }) {
  const [, removeConfig] = useAtom(removeConfiguration)
  const [active, setActive] = useAtom(activeIndex)

  function handleRemoveConfiguration() {
    removeConfig(removeIndex)
  }

  function handleSelectConfiguration() {
    setActive(selectIndex)
  }

  return <TableRow>
    <TableSelectRow radio checked={active == selectIndex} onSelect={handleSelectConfiguration} />
    <ConfigCells configuration={configuration} />
    {removeable ? <TableCell><IconButton onClick={handleRemoveConfiguration} kind="ghost" size="sm"><TrashCan /></IconButton></TableCell> : <TableCell />}
  </TableRow>
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
    <TableCell><TextInput size="sm" value={config.name} onChange={(e) => handleInputChange("name", e.target.value)} /></TableCell>
    <TableCell><TextInput size="sm" alue={config.host} onChange={(e) => handleInputChange("host", e.target.value)} /></TableCell>
    <TableCell><NumberInput size="sm" allowEmpty hideSteppers min={0} max={65535} value={config.anvilPort} onChange={(e) => handleInputChange("anvilPort", e.target.value)} /></TableCell>
    <TableCell><NumberInput size="sm" allowEmpty hideSteppers min={0} max={65535} value={config.s3Port} onChange={(e) => handleInputChange("s3Port", e.target.value)} /></TableCell>
    <TableCell><IconButton onClick={handleAddConfiguration} kind="ghost" size="sm"><Add /></IconButton></TableCell>
  </TableRow>
}
