import React, { useState, useMemo } from "react";
import ClosableModal from "./modal/ClosableModal";
import { workspaceAtom, lineageAtom } from "@/atoms/pipelineAtom";
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
import { AppConnectivity } from "@carbon/icons-react";
import { ExecutionCardGrid } from "./ExecutionCardGrid";

export const PipelineTableRow = ({ row, getRowProps }) => {
  return (
    <TableExpandRow {...getRowProps({ row })} expandHeader="Executions">
      {row.cells.map((cell) => (
        <TableCell key={cell.id}>
          {cell.info.header === "deployed" ? (
            <Tag type={cell.value ? "green" : "red"}>
              {cell.value ? "Deployed" : "Not Deployed"}
            </Tag>
          ) : (
            cell.value
          )}
        </TableCell>
      ))}
    </TableExpandRow>
  );
};

export const ExecutionDataGrid = ({ closeModal }) => {
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const [lineage] = useAtom(lineageAtom);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const selectExecution = (execution) => {
    const key = execution.pipeline + "." + execution.id;
    setWorkspace((draft) => {
      draft.tabs[key] = {};
      draft.active = key;
    });
    closeModal();
  };

  const headers = [
    { key: "name", header: "Pipeline Name" },
    { key: "hash", header: "Hash" },
    { key: "deployed", header: "Deployed" },
    { key: "executionCount", header: "Executions" },
  ];

  const allRows = useMemo(
    () =>
      Array.from(lineage.entries()).map(([hash, pipeline]) => ({
        id: hash,
        name: pipeline.name,
        hash: hash.substring(0, 8),
        deployed: pipeline.deployed,
        executionCount: pipeline.executions.size,
      })),
    [lineage],
  );

  console.log(allRows);

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
                    <TableExpandedRow colSpan={headers.length + 1}>
                      <ExecutionCardGrid
                        executions={lineage.get(row.id).executions}
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
              pageSizes={[5, 10, 15, 20]}
              totalItems={allRows.length}
              onChange={({ page, pageSize }) => {
                setCurrentPage(page);
                setPageSize(pageSize);
              }}
            />
          </>
        )}
      </DataTable>
    </ClosableModal>
  );
};
