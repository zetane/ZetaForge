import { Fragment, useMemo } from "react";
import { RadioButton, Button } from "@carbon/react";
import { ViewerCodeMirror } from "./CodeMirrorComponents";
import { Edit } from "@carbon/icons-react";

export default function ViewerFragment({i, selected, item, index, handleGenerate, handleEdit}) {
  console.log(index, item)
  return (
    <Fragment key={index}>
      <span className="block-editor-prompt">
        {item.prompt}
      </span>
      <div>
        <div className="flex items-center mb-4">
          <RadioButton
            checked={selected}
            onChange={() => handleGenerate(i)}
            labelText={`Select Code #${i}`}
          />
        </div>
        <div
          className="relative"
          style={{
            border:
              selected
                ? "2px solid darkorange"
                : "none",
          }}
        >
          <ViewerCodeMirror
            index={index}
            key={index+"-viewer"}
            code={item.response}
          />
          <div className="absolute right-4 top-4">
            <Button
              renderIcon={Edit}
              iconDescription="Edit Code"
              tooltipPosition="top"
              hasIconOnly
              size="md"
              onClick={() => handleEdit(i)}
            />
          </div>
        </div>
      </div>
    </Fragment>
  )
}
