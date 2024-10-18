import { useState } from "react";
import { TextInput, Toggle } from "@carbon/react";
import { ChevronDown, ChevronUp } from "@carbon/icons-react";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { useAtom } from "jotai";
import Tooltip from "@/components/ui/Tooltip";

export const BlockResources = ({ block, setFocusAction, id }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [configuration] = useAtom(activeConfigurationAtom);
  const [cpu, setCpu] = useState(block.action.resources?.cpu?.request || "");
  const [memory, setMemory] = useState(
    block.action.resources?.memory?.request || "",
  );
  const [gpuEnabled, setGpuEnabled] = useState(
    block.action.resources?.gpu?.count > 0,
  );
  console.log(configuration);
  const isLocalhost = configuration?.anvil?.host == "localhost";
  console.log("islocalhost:", isLocalhost);
  const toggleComponent = (
    <Toggle
      id={`gpu-toggle-${id}`}
      labelText="Use GPU"
      toggled={gpuEnabled}
      disabled={isLocalhost}
      onToggle={(checked) => handleResourceChange("gpu", checked)}
      className="mt-2"
    />
  );
  let toggle = { toggleComponent };
  if (isLocalhost) {
    toggle = (
      <Tooltip label="GPU is not available on local kubernetes, connect to Forge Cloud to use GPU.">
        {toggleComponent}
      </Tooltip>
    );
  }

  const handleResourceChange = (type, value) => {
    setFocusAction((draft) => {
      if (!draft.data[id].action.resources) {
        draft.data[id].action.resources = {};
      }
      if (type === "gpu") {
        draft.data[id].action.resources.gpu = { count: value ? 1 : 0 };
      } else {
        draft.data[id].action.resources[type] = {
          request: value,
          limit: value,
        };
      }
    });
    if (type === "cpu") setCpu(value);
    if (type === "memory") setMemory(value);
    if (type === "gpu") setGpuEnabled(value);
  };

  const iconStyles = { right: "5px" };

  return (
    <div className="cursor-pointer rounded-b-lg border-t border-solid border-[color:var(--cds-border-subtle)]">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-2 transition-colors"
      >
        <span>Resources</span>
        {isExpanded ? (
          <ChevronUp size={20} style={iconStyles} />
        ) : (
          <ChevronDown size={20} style={iconStyles} />
        )}
      </div>
      {isExpanded && (
        <div className="space-y-4 p-4">
          <TextInput
            id={`cpu-input-${id}`}
            labelText="CPU"
            value={cpu}
            onChange={(e) => handleResourceChange("cpu", e.target.value)}
            placeholder="e.g., 500m"
            size="sm"
            className="max-w-xs"
          />
          <TextInput
            id={`memory-input-${id}`}
            labelText="Memory"
            value={memory}
            onChange={(e) => handleResourceChange("memory", e.target.value)}
            placeholder="e.g., 512Mi"
            size="sm"
            className="max-w-xs"
          />
          {toggle}
        </div>
      )}
    </div>
  );
};
