import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { HeaderMenuItem } from "@carbon/react";
import { useAtom } from "jotai";
import { useRef } from "react";
import { getDirectoryPath } from "@/../utils/fileUtils";
import { useImmerAtom } from "jotai-immer";

export default function LoadPipelineButton() {
  const FILE_EXTENSION_REGEX = /\.[^/.]+$/;
  const [editor] = useAtom(drawflowEditorAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const fileInput = useRef();

  const selectFile = () => {
    fileInput.current.click();
  };

  const loadPipeline = async () => {
    const files = fileInput.current.files
    for (const key in files) {
      const file = files[key]
      const folder = file.webkitRelativePath.split("/")[0]
      const name = removeFileExtension(file.name)
      if (folder == name) {
        console.log(file)
        const data = JSON.parse(await (new Blob([file])).text())
        const folderPath = getDirectoryPath(file.path)
        data['sink'] = folderPath
        data['build'] = folderPath
        data['source'] = folderPath
        console.log(data)
        editor.load_pipeline(data);

        setPipeline((draft) => {
          draft.name = name
          draft.path = folderPath
        });
        break;
      }
    }
  };


  const removeFileExtension = (fileName) => {
    return fileName.replace(FILE_EXTENSION_REGEX, "");
  };

  return (
    <div>
      <HeaderMenuItem onClick={selectFile}>Pipeline</HeaderMenuItem>
      <input
        type="file"
        webkitdirectory=""
        directory=""
        ref={fileInput}
        onChange={loadPipeline}
        hidden
      />
    </div>
  );
}
