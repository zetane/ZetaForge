import { defaultAnvilConfigurationAtom, userAnvilConfigurationsAtom, removeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";

export default function ConfigTable({ onNew }) {
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
          <ConfigRows rows={rows} />
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

function ConfigRows({ rows }) {
  return rows.map((r, i) => <ConfigRow key={i} {...r} />);
}

function ConfigRow({ configuration, removeable, removeIndex, selectIndex }) {
  const [, removeConfiguration] = useAtom(removeConfigurationAtom);
  const [active, setActive] = useAtom(activeIndexAtom);

  function handleRemoveConfiguration() {
    removeConfiguration(removeIndex);
  }

  function handleSelectConfiguration() {
    setActive(selectIndex);
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
          <Button
            onClick={handleRemoveConfiguration}
            renderIcon={TrashCan}
            hasIconOnly
            iconDescription="Remove"
            tooltipAlignment="end"
            kind="ghost"
            size="sm"
          />
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

