"use client";

import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineName } from "@/atoms/pipelineAtom";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";

export default function LoadPipelineButton() {
  const FILE_EXTENSION_REGEX = /\.[^/.]+$/;
  const [editor] = useAtom(drawflowEditorAtom);
  const setPipelineName = useSetAtom(pipelineName);
  const fileInput = useRef();
  let [reader, setReader] = useState(null);

  useEffect(() => {
    reader = new FileReader();
    reader.onload = (e) => {
      const data = JSON.parse(e.target.result);
      editor.import_block(data);
    };
    setReader(reader);
  }, [editor]);

  const selectFile = () => {
    fileInput.current.click();
  };

  const loadPipeline = () => {
    const file = fileInput.current.files[0];
    reader.readAsText(file);

    const fileName = removeFileExtension(file.name);
    setPipelineName(fileName);
  };

  const removeFileExtension = (fileName) => {
    return fileName.replace(FILE_EXTENSION_REGEX, "");
  };

  return (
    <div>
      <HeaderMenuItem onClick={selectFile}>Load</HeaderMenuItem>
      <input
        type="file"
        accept=".json"
        ref={fileInput}
        onChange={loadPipeline}
        hidden
      />
    </div>
  );
}
