import {
  defaultAnvilConfigurationAtom,
  userAnvilConfigurationsAtom,
  removeConfigurationAtom,
  activeIndexAtom,
  activeConfigurationAtom,
} from "@/atoms/anvilConfigurationsAtom";
import axios from "axios";
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
  Dropdown,
} from "@carbon/react";
import {
  choosenKubeContexts,
  availableKubeContexts,
  drivers,
  chosenDriver,
  isPackaged,
} from "@/atoms/kubecontextAtom";
import { Add, TrashCan, Edit } from "@carbon/icons-react";
import { workspaceAtom } from "@/atoms/pipelineAtom";
import { useState, useEffect } from "react";

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
            <TableHeader>Context</TableHeader>
            <TableHeader>Driver</TableHeader>
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
  const [currentConfigAtom, setCurrentConfig] = useAtom(
    activeConfigurationAtom,
  );
  const [isPackaged, setIsPackaged] = useState(false);
  const serverAddress = import.meta.env.VITE_EXPRESS;

  useEffect(() => {
    async function checkIfPackaged() {
      try {
        const res = await axios.get(`${serverAddress}/isPackaged`);
        setIsPackaged(res.data);
      } catch (err) {
        console.log(err.message);
      }
    }
    checkIfPackaged();
  }, []);
  return rows.map((r, i) => (
    <ConfigRow
      key={i}
      onEdit={onEdit}
      {...r}
      isSelected={r.configuration === currentConfigAtom}
      isCloud={
        !(
          r.configuration.anvil.host === "localhost" ||
          r.configuration.anvil.host === "127.0.0.1"
        )
      }
      isPackaged={isPackaged}
    />
  ));
}

function ConfigRow({
  configuration,
  removeable,
  removeIndex,
  selectIndex,
  onEdit,
  isSelected,
  isCloud,
  isPackaged,
}) {
  const [availableKubeContextsAtom, setAvailableKubeContexts] = useAtom(
    availableKubeContexts,
  );
  const [currentKubeContext, setCurrentKubeContext] =
    useAtom(choosenKubeContexts);
  const [availableDrivers] = useAtom(drivers);

  const [currentChosenDriver, setChosenDriver] = useAtom(chosenDriver);
  const [, removeConfiguration] = useAtom(removeConfigurationAtom);
  const [active, setActive] = useAtom(activeIndexAtom);
  const [workspace, setWorkspace] = useAtom(workspaceAtom);

  function handleEditConfiguration() {
    onEdit(removeIndex, configuration);
  }

  function handleSelectConfiguration() {
    setActive(selectIndex);
  }

  function handleRemoveConfiguration() {
    removeConfiguration(removeIndex);
  }
  const handleSelection = async (e) => {
    try {
      setCurrentKubeContext(e.selectedItem);
    } catch (err) {
      console.log(err);
    }
  };

  const handleDriverSelection = async (e) => {
    setChosenDriver(e.selectedItem);
  };

  const disable = !isPackaged || !isSelected || isCloud;
  return (
    <TableRow>
      <TableSelectRow
        radio
        checked={active == selectIndex}
        onSelect={handleSelectConfiguration}
      />
      <ConfigCells configuration={configuration} />

      <TableCell className="context-cell">
        <Dropdown
          items={availableKubeContextsAtom}
          onChange={handleSelection}
          disabled={disable}
          selectedItem={isCloud ? "" : currentKubeContext}
        />
      </TableCell>
      <TableCell className="driver-cell">
        <Dropdown
          items={availableDrivers}
          onChange={handleDriverSelection}
          disabled={disable}
          selectedItem={isCloud ? "" : currentChosenDriver}
        />
      </TableCell>
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
