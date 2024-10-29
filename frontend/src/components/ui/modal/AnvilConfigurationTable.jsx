import {
  defaultAnvilConfigurationAtom,
  userAnvilConfigurationsAtom,
  removeConfigurationAtom,
  activeIndexAtom,
} from "@/atoms/anvilConfigurationsAtom";
import { useAtom } from "jotai";
import {
  Table,
  TableRow,
  TableHead,
  TableHeader,
  TableBody,
  TableCell,
  TableSelectRow,
  Button,
} from "@carbon/react";
import { Add, TrashCan, Edit } from "@carbon/icons-react";

export default function AnvilConfigurationTable({ onNew, onEdit }) {
  const [defaultAnvilConfiguration] = useAtom(defaultAnvilConfigurationAtom);
  const [userAnvilConfigurations] = useAtom(userAnvilConfigurationsAtom);

  const defaultRows = [defaultAnvilConfiguration].map((c) => ({
    configuration: c,
    deletable: false,
  }));
  const userRows = userAnvilConfigurations.map((c, i) => ({
    configuration: c,
    removeable: true,
    removeIndex: i,
  }));
  const rows = [...defaultRows, ...userRows].map((r, i) => ({
    ...r,
    selectIndex: i,
  }));

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader />
            <TableHeader>Name</TableHeader>
            <TableHeader>Anvil</TableHeader>
            <TableHeader>S3</TableHeader>
            <TableHeader />
          </TableRow>
        </TableHead>
        <TableBody>
          <ConfigRows rows={rows} onEdit={onEdit} />
        </TableBody>
      </Table>
      <div className="flex justify-center">
        <Button
          renderIcon={Add}
          hasIconOnly
          iconDescription="Add"
          tooltipAlignment="end"
          kind="ghost"
          size="sm"
          onClick={onNew}
        />
      </div>
    </>
  );
}

function ConfigRows({ rows, onEdit }) {
  return rows.map((r, i) => <ConfigRow key={i} onEdit={onEdit} {...r} />);
}

function ConfigRow({
  configuration,
  removeable,
  removeIndex,
  selectIndex,
  onEdit,
}) {
  const [, removeConfiguration] = useAtom(removeConfigurationAtom);
  const [active, setActive] = useAtom(activeIndexAtom);

  function handleEditConfiguration() {
    onEdit(removeIndex, configuration);
  }

  function handleSelectConfiguration() {
    setActive(selectIndex);
  }

  function handleRemoveConfiguration() {
    removeConfiguration(removeIndex);
  }

  return (
    <TableRow>
      <TableSelectRow
        radio
        checked={active == selectIndex}
        onSelect={handleSelectConfiguration}
      />
      <ConfigCells configuration={configuration} />
      {removeable ? (
        <TableCell>
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleEditConfiguration}
              renderIcon={Edit}
              hasIconOnly
              iconDescription="Edit"
              tooltipAlignment="end"
              kind="ghost"
              size="sm"
            />
            <Button
              onClick={handleRemoveConfiguration}
              renderIcon={TrashCan}
              hasIconOnly
              iconDescription="Remove"
              tooltipAlignment="end"
              kind="ghost"
              size="sm"
            />
          </div>
        </TableCell>
      ) : (
        <TableCell />
      )}
    </TableRow>
  );
}

function ConfigCells({ configuration }) {
  const getDisplayName = (host, port) => {
    return port ? `${host}:${port}` : host;
  };

  const displayedConfiguration = [
    configuration.name,
    getDisplayName(configuration.anvil.host, configuration.anvil.port),
    getDisplayName(configuration.s3.host, configuration.s3.port),
  ];

  return displayedConfiguration.map((r, i) => (
    <TableCell key={i}>{r}</TableCell>
  ));
}
