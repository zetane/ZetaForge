import ClosableModal from "./modal/ClosableModal";
import { executionAtom } from "@/atoms/executionAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { useSetAtom } from "jotai";
import { useImmerAtom } from "jotai-immer";
import { DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell, Link, IconButton, Button } from "@carbon/react";
import { useMemo } from "react";
import { PipelineStopButton } from "./PipelineStopButton";

export const ExecutionDataGrid = () => {
  const [execution, setExecution] = useImmerAtom(executionAtom);
  const setPipeline = useSetAtom(pipelineAtom);
  const loadPipeline = (key) => {
    const selected = execution.executions[key]
    setPipeline(selected)
  }

  const rows = useMemo(() => {
    const items = []

    for (const [key, value] of Object.entries(execution.executions)) {
      const data = JSON.parse(value.Json)
      const label = data?.metadata?.generateName
      const stopAction = (<PipelineStopButton executionId={key}/>)
      items.push({
        id: key, 
        name: <Link href="#" onClick={(key) => loadPipeline(key)}>{label}</Link>, 
        created: new Date(value.Created * 1000).toLocaleString(), 
        status: value.Status,
        actions: stopAction
      })
    }

    return items
  }, [execution?.executions])
  const headers = [
    {
      key: 'name',
      header: 'Name',
    },
    {
      key: 'created',
      header: 'Created'
    },
    {
      key: 'status',
      header: 'Status',
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
      <DataTable rows={rows} headers={headers}>
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
