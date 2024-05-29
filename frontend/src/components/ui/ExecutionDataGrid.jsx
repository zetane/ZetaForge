import ClosableModal from "./modal/ClosableModal";
import { workspaceAtom } from "@/atoms/pipelineAtom";
import { useImmerAtom } from "jotai-immer";
import { DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell, Link } from "@carbon/react";
import { PipelineStopButton } from "./PipelineStopButton";

export const ExecutionDataGrid = () => {
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const loadPipeline = (pipeline) => {
    console.log("pushing ", pipeline)
    setWorkspace((draft) => {
      if (!draft.tabs.includes(pipeline.id)) {
        draft.tabs.push(pipeline.id)
      }
      draft.active = pipeline.id
    })
  }

  const items = []

  for (const pipeline of workspace?.running()) {
    const record = pipeline.record;
    const pipelineData = JSON.parse(record.PipelineJson)
    const friendlyName = pipelineData.name
    const executionId = record?.Execution;
    const stopAction = <PipelineStopButton executionId={executionId} />;

    items.push({
      id: pipeline.id,
      pipeline: pipeline.id,
      name: <Link href="#" onClick={() => {loadPipeline(pipeline)}}>{friendlyName}</Link>,
      created: new Date(record?.Created * 1000).toLocaleString(),
      status: record?.Status,
      deployed: record?.Deployed,
      actions: stopAction,
    });
  }

  const headers = [
    {
      key: 'name',
      header: 'Name',
    },
    {
      key: 'pipeline',
      header: 'Pipeline'
    },
    {
      key: 'created',
      header: 'Created'
    },
    {
      key: 'status',
      header: 'Status'
    },
    {
      key: 'deployed',
      header: 'Deployed'
    },
    {
      key: 'actions',
      header: 'Actions'
    }
  ];
  return (
    <ClosableModal
      modalHeading="Running Pipelines"
      passiveModal={true}
      modalClass="custom-modal-size"
    >
      <DataTable rows={items} headers={headers}>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableHeader {...getHeaderProps({ header })}>
                    {header.header}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow {...getRowProps({ row })}>
                  {row.cells.map((cell) => {
                    return (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTable>
    </ClosableModal>
  );
};
