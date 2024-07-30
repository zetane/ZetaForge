import { pipelineAtom } from "@/atoms/pipelineAtom";
import { useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import Splitter from "./Splitter";
import FileExplorer from "./FileExplorer";
import CodeEditor from "./CodeEditor";
import PromptList from "./PromptList";

export default function DirectoryViewer({ blockPath, blockKey }) {
  const serverAddress = "http://localhost:3330";
  const [fileSystem, setFileSystem] = useState({});
  const [currentFile, setCurrentFile] = useState({});
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [pipeline] = useAtom(pipelineAtom);

  useEffect(() => {
    fetchFileSystem();
  }, [pipeline]);

  const fetchFileSystem = useCallback(async () => {
    try {
      const response = await fetch(`${serverAddress}/get-directory-tree`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folder: blockPath }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const inserted_data = {
        [blockKey]: { content: data, expanded: true, type: "folder" },
      };
      setFileSystem(inserted_data);
    } catch (error) {
      console.error("Error fetching file system:", error);
    }
  }, [blockPath]);

  return (
    <div className="flex h-full">
      <FileExplorer
        currentFile={currentFile}
        fileSystem={fileSystem}
        fetchFileSystem={fetchFileSystem}
        unsavedChanges={unsavedChanges}
        setCurrentFile={setCurrentFile}
      />
      <PromptList />
      <Splitter />
      <CodeEditor
        currentFile={currentFile}
        setCurrentFile={setCurrentFile}
        setUnsavedChanges={setUnsavedChanges}
        fileSystem={fileSystem}
        setFileSystem={setFileSystem}
        fetchFileSystem={fetchFileSystem}
      />
    </div>
  );
}
