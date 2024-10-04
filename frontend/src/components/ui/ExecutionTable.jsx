import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Link,
} from "@carbon/react";
import { PipelineStopButton } from "./PipelineStopButton";
import { useAtom } from "jotai";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";

export const ExecutionTable = ({ executions, closeModal }) => {
  const [configuration] = useAtom(activeConfigurationAtom);
  const selectExecution = (execution) => {
    const key = execution.pipeline + "." + execution.id;

    setWorkspace((draft) => {
      draft.tabs[key] = {};
      draft.active = key;
    });

    closeModal();
  };

  const headers = [
    { key: "id", header: "Execution ID" },
    { key: "created", header: "Created" },
    { key: "status", header: "Status" },
    { key: "actions", header: "Actions" },
  ];

  const rows = Array.from(executions.entries()).map(([id, execution]) => ({
    id: execution.id,
    created: execution.created,
    status: execution.status,
    actions:
      execution.status === "Running" || execution.status === "Pending" ? (
        <PipelineStopButton
          executionId={execution.id}
          configuration={configuration}
        />
      ) : null,
  }));

  return (
    <DataTable rows={rows} headers={headers} size="sm">
      {({ rows, headers, getHeaderProps, getRowProps }) => (
        <Table size="sm">
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
                {row.cells.map((cell) => (
                  <TableCell key={cell.id}>
                    {cell.info.header === "id" ? (
                      <Link href="#" onClick={() => selectExecution(row)}>
                        {cell.value}
                      </Link>
                    ) : (
                      cell.value
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DataTable>
  );
};
