import {
  StructuredListWrapper,
  StructuredListHead,
  StructuredListBody,
  StructuredListRow,
  StructuredListCell,
  CodeSnippet,
} from "@carbon/react";

const BlockEventsContent = ({ blockEvents }) => {
  console.log("events: ", blockEvents);
  const { inputs, outputs } = blockEvents;

  const renderValue = (value) => {
    if (typeof value === "object" && value !== null) {
      return (
        <CodeSnippet type="multi">{JSON.stringify(value, null, 2)}</CodeSnippet>
      );
    }
    return value;
  };

  const renderList = (title, data) => (
    <StructuredListWrapper className="mb-4">
      <StructuredListHead>
        <StructuredListRow head>
          <StructuredListCell head className="w-1/3">
            {title}
          </StructuredListCell>
          <StructuredListCell head className="w-2/3">
            Value
          </StructuredListCell>
        </StructuredListRow>
      </StructuredListHead>
      <StructuredListBody>
        {Object.entries(data ?? []).map(([key, value]) => (
          <StructuredListRow key={key}>
            <StructuredListCell className="w-1/3">{key}</StructuredListCell>
            <StructuredListCell className="w-2/3">
              {renderValue(value)}
            </StructuredListCell>
          </StructuredListRow>
        ))}
      </StructuredListBody>
    </StructuredListWrapper>
  );

  return (
    <div className="flex flex-col gap-4 p-3">
      {renderList("Inputs", inputs)}
      {renderList("Outputs", outputs)}
    </div>
  );
};

export default BlockEventsContent;
