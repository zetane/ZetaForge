import { defaultAnvilConfiguration, userAnvilConfigurations } from "@/atoms/anvilHost";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { useAtom } from "jotai";
import ClosableModal from "./ClosableModal";


export default function AnvilConfigModal() {
  const [defaultConfiguration] = useAtom(defaultAnvilConfiguration)
  const [userConfigurations] = useAtom(userAnvilConfigurations)

  console.log(defaultConfiguration);
  return (<ClosableModal
    modalHeading="Anvil Configurations"
    primaryButtonText="Save"
    secondaryButtonText="Cancel"
    size="md"
  >
    <Table>
      <TableHead>
        <TableRow>
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
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <ConfigCells configuration={defaultConfiguration} />
        </TableRow>
        <ConfigRows configurations={userConfigurations} />
      </TableBody>
    </Table>
  </ClosableModal>
  )
}

function ConfigRows({ configurations }) {
  return configurations.map((c, i) => <TableRow key={i}><ConfigCells configuration={c} /></TableRow>)
}

function ConfigCells({ configuration }) {
  return Object.keys(configuration).map((k) => <TableCell key={k}>{configuration[k]}</TableCell>)
}
