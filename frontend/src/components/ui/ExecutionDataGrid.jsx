import React, { useState, useMemo } from "react";
import ClosableModal from "./modal/ClosableModal";
import { workspaceAtom } from "@/atoms/pipelineAtom";
import { useImmerAtom } from "jotai-immer";
import { useAtom } from "jotai";
import {
  DataTable,
  Pagination,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableExpandRow,
  TableExpandedRow,
  TableExpandHeader,
  Tag,
} from "@carbon/react";
import { ExecutionCardGrid } from "./ExecutionCardGrid";
import { DeployedPipelineActions } from "./DeployedPipelineActions";
import { PipelineDeployButton } from "./PipelineDeployButton";
import { useSyncExecutionResults } from "@/hooks/useExecutionResults";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { useLoadExecution } from "@/hooks/useLoadPipeline";

export const PipelineTableRow = ({ row, getRowProps }) => {
  return (
    <TableExpandRow {...getRowProps({ row })} expandHeader="Executions">
      {row.cells.map((cell) => (
        <TableCell key={cell.id}>{cell.value}</TableCell>
      ))}
    </TableExpandRow>
  );
};

export const ExecutionDataGrid = ({ closeModal }) => {
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const syncResults = useSyncExecutionResults();
  const [configuration] = useAtom(activeConfigurationAtom);
  const loadExecution = useLoadExecution();

  const setPagination = ({ page, pageSize }) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  const selectExecution = async (execution) => {
    console.log(execution);
    const key = execution.Uuid + "." + execution.Execution;

    const serverExec = await loadExecution(execution);
    console.log(serverExec);
    setWorkspace((draft) => {
      draft.pipelines[key] = serverExec;
      draft.tabs[key] = {};
      draft.active = key;
    });
    await syncResults(key);

    closeModal();
  };

  const headers = [
    { key: "name", header: "Pipeline Name" },
    { key: "created", header: "Created" },
    { key: "lastExecution", header: "Last Execution" },
    { key: "host", header: "Host" },
    { key: "hash", header: "Hash" },
    { key: "deployed", header: "Deployed" },
    { key: "executionCount", header: "Executions" },
  ];

  const allRows = useMemo(() => {
    return Array.from(workspace?.lineage.entries()).map(([hash, pipeline]) => {
      const deployedAction = pipeline?.deployed ? (
        <DeployedPipelineActions
          uuid={pipeline.id}
          hash={hash}
          configuration={configuration}
          pipelineData={pipeline.pipelineData}
        />
      ) : (
        <PipelineDeployButton
          uuid={pipeline.id}
          hash={hash}
          configuration={configuration}
        />
      );
      return {
        id: hash,
        created: pipeline.created,
        lastExecution: pipeline.lastExecution,
        name: pipeline.name,
        host: pipeline.host,
        hash: hash.substring(0, 8),
        deployed: deployedAction,
        executionCount: pipeline.executions?.size,
      };
    });
  }, [workspace?.lineage]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return allRows.slice(startIndex, startIndex + pageSize);
  }, [allRows, currentPage, pageSize]);

  return (
    <ClosableModal
      modalHeading="Pipeline Executions"
      passiveModal={true}
      modalClass="custom-modal-size"
    >
      <DataTable rows={paginatedRows} headers={headers}>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
          <>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  <TableExpandHeader />
                  {headers.map((header) => (
                    <TableHeader {...getHeaderProps({ header })}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <React.Fragment key={row.id}>
                    <PipelineTableRow row={row} getRowProps={getRowProps} />
                    <TableExpandedRow colSpan={10} className="execution-group">
                      <ExecutionCardGrid
                        executions={workspace?.lineage.get(row.id).executions}
                        selectExecution={selectExecution}
                      />
                    </TableExpandedRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
            <Pagination
              backwardText="Previous page"
              forwardText="Next page"
              itemsPerPageText="Items per page:"
              page={currentPage}
              pageNumberText="Page Number"
              pageSize={pageSize}
              pageSizes={[15, 30, 45]}
              totalItems={allRows.length}
              onChange={setPagination}
            />
          </>
        )}
      </DataTable>
    </ClosableModal>
  );
};
