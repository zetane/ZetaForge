import { DocumentDownload, FolderOpen } from "@carbon/icons-react";
import { Button, TreeView } from "@carbon/react";
import { act, useRef } from "react";
import DirentNode from "./DirentNode";
import { trpc } from "@/utils/trpc";

export default function FileExplorer({
  pipelineId,
  blockId,
  currentFile,
  fetchFileSystem,
  setCurrentFile,
}) {
  const root = trpc.block.file.get.useQuery({
    pipelineId: pipelineId,
    blockId: blockId,
  });
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleFolderImport = () => {
    folderInputRef.current.click();
  };

  const handleFileImport = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const files = event.target.files;
    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
      formData.append("paths", files[i].name);
    }

    formData.append("blockPath", blockPath);
    try {
      const response = await fetch(`${serverAddress}/import-files`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      fetchFileSystem();
    } catch (error) {
      console.error("Error during import:", error);
    }
  };

  const handleFolderChange = async (event) => {
    const files = event.target.files;
    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
      formData.append("paths", files[i].webkitRelativePath);
    }

    formData.append("blockPath", blockPath);
    try {
      const response = await fetch(`${serverAddress}/import-folder`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      fetchFileSystem();
    } catch (error) {
      console.error("Error during import:", error);
    }
  };
  console.log(root.data); 
  return (
    <div className="flex flex-col">
      <div className="flex gap-x-1">
        <Button
          renderIcon={FolderOpen}
          size="sm"
          iconDescription="Import folder"
          onClick={handleFolderImport}
          title="Import folder into your block folder"
        >
          Add Folder
        </Button>
        <Button
          renderIcon={DocumentDownload}
          size="sm"
          iconDescription="Import files"
          onClick={handleFileImport}
          title="Import files into your block folder"
        >
          Add Files
        </Button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          hidden
        />

        <input
          type="file"
          ref={folderInputRef}
          onChange={handleFolderChange}
          webkitdirectory="true"
          multiple
          hidden
        />
      </div>
      <div className="mt-1 w-80 overflow-y-auto">
        {root.data && (
          <TreeView
            label="directory view"
            selected={currentFile.file}
            hideLabel
          >
            <DirentNode
              name={root.data.name}
              path={root.data.path}
              children={root.data.children}
              setCurrentFile={setCurrentFile}
            />
          </TreeView>
        )}
      </div>
    </div>
  );
}
