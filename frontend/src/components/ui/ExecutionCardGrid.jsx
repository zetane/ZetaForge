import { useState } from "react";
import { Grid, Column, Tag, Button } from "@carbon/react";
import { Launch } from "@carbon/icons-react";
import { useQuery } from "@tanstack/react-query";
import { fetchExecutionDetails } from "@/client/anvil";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { useAtom } from "jotai";

const ExecutionCard = ({ execution, onSelect }) => {
  const [configuration] = useAtom(activeConfigurationAtom);

  const { refetch, isError } = useQuery({
    queryKey: ["execution", execution.id],
    queryFn: () => fetchExecutionDetails(configuration, execution.id),
    enabled: false,
  });

  const handleViewDetails = async (configuration) => {
    const result = await refetch();
    try {
      if (result.data) {
        onSelect(result.data, configuration);
      } else {
        console.log("No data");
      }
    } catch (error) {
      console.error("Error fetching execution details: ", error);
    }
  };

  let tagType = "green";
  if (execution?.status == "Failed") {
    tagType = "red";
  } else if (execution?.status == "Pending") {
    tagType = "blue";
  }

  return (
    <div className="execution-card">
      <div>
        <div
          className="execution-card-title"
          style={{ backgroundColor: "var(--title-background-color)" }}
        >
          <span>{execution.id.substring(28, 36)}</span>
        </div>
        <div className="execution-card-body">
          <Tag type={tagType} style={{ width: "50%" }}>
            {execution.status}
          </Tag>
          <div className="execution-data-body">
            <span>{new Date(execution.created).toLocaleString()}</span>
          </div>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Launch}
            iconDescription="Load Execution"
            onClick={() => {
              handleViewDetails(configuration);
            }}
          >
            View
          </Button>
          {isError && <p>Error fetching details</p>}
        </div>
      </div>
    </div>
  );
};

export const ExecutionCardGrid = ({ executions, selectExecution }) => {
  const [currentPage] = useState(1);
  const itemsPerPage = 36;
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
    </div>
  );
};
