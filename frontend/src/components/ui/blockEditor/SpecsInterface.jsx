import { pipelineAtom } from "@/atoms/pipelineAtom";
import { trpc } from "@/utils/trpc";
import { Save } from "@carbon/icons-react";
import { Button, TextArea, TextInput } from "@carbon/react";
import { useImmerAtom } from "jotai-immer";
import { useEffect, useMemo } from "react";
import { useImmer } from "use-immer";

const HIDDEN_SPEC_KEYS = [
  "connections",
  "relays",
  "command_line",
  "pos_x",
  "pos_y",
  "pos_z",
  "parameters",
  "system_versions",
];

const flattenSpecs = (data, prefix = "", path = []) => {
  let fields = [];
  Object.keys(data).forEach((key) => {
    if (HIDDEN_SPEC_KEYS.includes(key)) {
      return;
    }

    const newPath = path.concat(key);
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (
      typeof data[key] === "object" &&
      !Array.isArray(data[key]) &&
      data[key] !== null
    ) {
      fields = fields.concat(flattenSpecs(data[key], newKey, newPath));
    } else {
      let label = key;
      if (newPath.includes("inputs") || newPath.includes("outputs")) {
        const typeLabel = newPath[0].charAt(0) + newPath[0].slice(1);
        const varName = newPath[newPath.length - 2];
        label = `${typeLabel} ${varName} Type`;
      }
      label = label.replace(/_/g, " ");
      fields.push({ key: newKey, path: newPath, label, value: data[key] });
    }
  });
  return fields;
};

export default function SpecsInterface({ blockKey }) {
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [blockSpecsBuffer, setBlockSpecsBuffer] = useImmer(
    pipeline.data[blockKey],
  );
  const flattenedSpecs = useMemo(
    () => flattenSpecs(blockSpecsBuffer),
    [blockSpecsBuffer],
  );

  useEffect(() => {
    setBlockSpecsBuffer(pipeline.data[blockKey]);
  }, [pipeline]);

  const saveBlockSpecs = trpc.saveBlockSpecs.useMutation();

  const handleInputChange = (path, value) => {
    const lastKey = path.pop();
    setBlockSpecsBuffer((prevBuffer) => {
      const lastObj = path.reduce(
        (obj, key) => (obj[key] = obj[key] || {}),
        prevBuffer,
      );
      lastObj[lastKey] = value;
    });
  };

  const saveSpecs = () => {
    saveBlockSpecs.mutate({
      pipelineId: pipeline.id,
      blockId: blockKey,
      blockSpecs: blockSpecsBuffer,
    });
    setPipeline((draft) => {
      draft.data[blockKey] = blockSpecsBuffer;
    });
  };

  return (
    <div className="flex w-full flex-col items-center justify-center p-4">
      <div className="grid w-full max-w-4xl grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        {flattenedSpecs.map(({ key, path, label, value }) => (
          <div key={key} className="mb-4 w-full">
            {label.toLowerCase().includes("description") ? (
              <TextArea
                labelText={label}
                id={key}
                className="w-full resize-y"
                value={value || ""}
                onChange={(e) => handleInputChange(path, e.target.value)}
                rows={4}
              />
            ) : (
              <TextInput
                labelText={label}
                id={key}
                className="w-full"
                value={value || ""}
                onChange={(e) => handleInputChange(path, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
      <Button
        className="mt-4"
        renderIcon={Save}
        kind="primary"
        onClick={saveSpecs}
      >
        Save Changes
      </Button>
    </div>
  );
}
