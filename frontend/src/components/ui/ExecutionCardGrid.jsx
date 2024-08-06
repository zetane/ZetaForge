import React, { useState } from "react";
import { Grid, Column, Pagination, Tag, Button } from "@carbon/react";
import { Launch } from "@carbon/react/icons";

const ExecutionCard = ({ execution, onSelect }) => (
  <div
    className="execution-card"
    style={{
      border: "1px solid #e0e0e0",
      padding: "1rem",
      borderRadius: "4px",
    }}
  >
    <h4>{execution.id.substring(0, 8)}</h4>
    <p>{new Date(execution.created).toLocaleString()}</p>
    <Tag type={execution.status === "Completed" ? "green" : "blue"}>
      {execution.status}
    </Tag>

    <Button
      kind="ghost"
      size="sm"
      renderIcon={Launch}
      iconDescription="View details"
      onClick={() => onSelect(execution)}
    >
      View Details
    </Button>
  </div>
);

export const ExecutionCardGrid = ({ executions, selectExecution }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = Array.from(executions.values()).slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  return (
    <div>
      <Grid narrow>
        {currentItems.map((execution) => (
          <Column sm={4} md={4} lg={3} key={execution.id}>
            <ExecutionCard execution={execution} onSelect={selectExecution} />
          </Column>
        ))}
      </Grid>
      <Pagination
        backwardText="Previous page"
        forwardText="Next page"
        itemsPerPageText="Items per page:"
        page={currentPage}
        pageNumberText="Page Number"
        pageSize={itemsPerPage}
        pageSizes={[12, 24, 36, 48]}
        totalItems={executions.length}
        onChange={({ page }) => setCurrentPage(page)}
      />
    </div>
  );
};
