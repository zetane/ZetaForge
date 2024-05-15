import { compilationErrorToastAtom } from '@/atoms/compilationErrorToast';
import { drawflowEditorAtom } from '@/atoms/drawflowAtom';
import { pipelineAtom } from '@/atoms/pipelineAtom';
import { updateSpecs } from '@/utils/specs';
import { trpc } from '@/utils/trpc';
import {
  Document,
  DocumentDownload,
  Folder,
  FolderOpen,
  Save,
} from "@carbon/icons-react";
import { Button, Modal, TreeNode, TreeView } from "@carbon/react";
import { useAtom } from 'jotai';
import { useImmerAtom } from 'jotai-immer';
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorCodeMirror, ViewerCodeMirror } from "./CodeMirrorComponents";
import ComputationsFileEditor from "./ComputationsFileEditor";
import Splitter from "./Splitter";

export default function DirectoryViewer({
  fileSystemProp,
  blockPath,
  lastGeneratedIndex,
  fetchFileSystem,
  blockFolderName,
}) {
  const serverAddress = "http://localhost:3330";
  const [fileSystem, setFileSystem] = useState({});
  const [currentFile, setCurrentFile] = useState({});
  const [navWidth, setNavWidth] = useState(300);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [editor] = useAtom(drawflowEditorAtom);
  const [compilationErrorToast, setCompilationErrorToast] = useAtom(compilationErrorToastAtom)
  const [isComputationsFile, setIsComputationsFile] = useState(false);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const compileComputation = trpc.compileComputation.useMutation();
  const saveBlockSpecs = trpc.saveBlockSpecs.useMutation();

  useEffect(() => {
    setFileSystem(fileSystemProp);
  }, [fileSystemProp], fileSystem);

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

  const handleFolderImport = () => {
    folderInputRef.current.click();
  };

  const handleFolderChange = async (event) => {
    const files = event.target.files;
    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i])
      formData.append("paths", files[i].webkitRelativePath);


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

  const handleModalConfirm = (e) => {
    saveChanges(e);
    if (pendingFile) {
      const relPath = pendingFile.replaceAll('\\', '/')
      const pathSegments = relPath.split("/");
      let fileContent = fileSystem;

      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];
        if (i === pathSegments.length - 1) {
          fileContent = fileContent[segment].content;
        } else {
          fileContent = fileContent[segment].content;
        }
      }

      setCurrentFile({ path: pendingFile, content: fileContent });
    }
    setIsModalOpen(false);
    setPendingFile(null);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
  };

  const handleDrag = useCallback((e) => {
    const newWidth = e.clientX - 22.5;
    setNavWidth(newWidth);
  }, []);

  const onToggle = (folderPath) => {
    setFileSystem((prevFileSystem) => {
      const toggleFolder = (pathSegments, fileSystem) => {
        if (!fileSystem || typeof fileSystem !== "object") {
          return fileSystem;
        }

        const [currentSegment, ...remainingSegments] = pathSegments;
        if (!fileSystem[currentSegment]) {
          console.error(
            `No such folder: ${currentSegment} in path ${folderPath}`,
          );
          return fileSystem;
        }

        if (!remainingSegments.length) {
          return {
            ...fileSystem,
            [currentSegment]: {
              ...fileSystem[currentSegment],
              expanded: !fileSystem[currentSegment].expanded,
            },
          };
        } else {
          return {
            ...fileSystem,
            [currentSegment]: {
              ...fileSystem[currentSegment],
              content: toggleFolder(
                remainingSegments,
                fileSystem[currentSegment].content,
              ),
            },
          };
        }
      };
      let relPath = folderPath.replaceAll('\\', '/')

      return toggleFolder(relPath.split("/"), prevFileSystem);
    });
  };

  const onChange = (newValue) => {
    setUnsavedChanges(true);

    setCurrentFile((prevCurrentFile) => ({
      ...prevCurrentFile,
      content: newValue,
    }));

    setFileSystem((prevFileSystem) => {
      const relPath = currentFile.path.replaceAll('\\', '/')
      const pathSegments = relPath.split("/");
      let updatedFileSystem = { ...prevFileSystem };

      let currentLevel = updatedFileSystem;
      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];

        if (i === pathSegments.length - 1) {
          currentLevel[segment] = {
            ...currentLevel[segment],
            content: newValue,
          };
        } else {
          currentLevel = currentLevel[segment].content;
        }
      }

      return updatedFileSystem;
    });
  };

  const isComputation = (path) => {
    return path.endsWith("computations.py")
  }

    const saveChanges = (e) => {
    if (!currentFile || !currentFile.path) {
      console.error("No file selected");
      return;
    }

    const saveData = {
      pipelinePath: pipeline.buffer,
      filePath: currentFile.path,
      content: currentFile.content
    };

    fetch(`${serverAddress}/save-file`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(saveData),
    })
      .then((response) => response.json())
      .then(async (data) => {
        setUnsavedChanges(false);
        if (isComputation(currentFile.path)) {
          try {
            const newSpecsIO = await compileComputation.mutateAsync({ blockPath: blockPath });
            const newSpecs = await updateSpecs(blockFolderName, newSpecsIO, pipeline.data, editor);
            setPipeline((draft) => {
              draft.data[blockFolderName] = newSpecs;
            })
            await saveBlockSpecs.mutateAsync({ blockPath: blockPath, blockSpecs: newSpecs });
            fetchFileSystem();
          } catch (error) {
            console.error(error)
            setCompilationErrorToast(true);
          }
        }
      })
      .catch((error) => {
        console.error("Error saving file:", error);
      });
    e.currentTarget.blur();
  };

  const renderTreeNodes = (folder, folderData, parentPath = "") => {
    const content = folderData && folderData.content ? folderData.content : {};
    const currentPath = parentPath ? `${parentPath}/${folder}` : folder;

    const specialFiles = [
      "computations.py", "Dockerfile", "requirements.txt"
    ];

    const isSpecialFile = specialFiles.includes(folder);
    const textStyle = isSpecialFile ? { color: "darkorange", paddingRight: "4px", paddingLeft: "4px" } : {};

    const handleFileClick = (filePath) => {
      if (unsavedChanges) {
        setPendingFile(filePath);
        setIsModalOpen(true);
      } else {
        if (filePath.endsWith(".html")) {
          const fileContent = folderData.content;
          const blob = new Blob([fileContent], { type: "text/html" });
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank");
        } else {
          setCurrentFile({ path: filePath, content: folderData.content });
          setIsComputationsFile(filePath.endsWith("computations.py"));
        }
      }
    };

    return (
      <TreeNode
        key={folder}
        label={
          <span
            style={textStyle}
            onClick={() =>
              folderData.type === "folder"
                ? onToggle(currentPath)
                : handleFileClick(currentPath)
            }
          >
            {folder}
          </span>
        }
        renderIcon={folderData.type === "folder" ? Folder : Document}
        isExpanded={folderData.type === "folder" && folderData.expanded}
      >
        {folderData.type === "folder" &&
          Object.entries(content).map(([subFolder, subFolderData]) =>
            renderTreeNodes(subFolder, subFolderData, currentPath),
          )}
      </TreeNode>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-col">
        <div className="flex gap-x-1">
          <Button
            renderIcon={FolderOpen}
            size="sm"
            iconDescription="Import folder"
            tooltipPosition="right"
            onClick={handleFolderImport}
            title="Import folder into your block folder"
          >
            Add Folder
          </Button>
          <Button
            renderIcon={DocumentDownload}
            size="sm"
            iconDescription="Import files"
            tooltipPosition="bottom"
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
        {lastGeneratedIndex !== undefined &&
          lastGeneratedIndex !== null &&
          lastGeneratedIndex.toString() !== "" ? (
          <div>
            <div
              style={{
                marginBottom: "0px",
                marginTop: "15px",
                textAlign: "left",
              }}
            >
              {"Generated from: "}
              <span>{lastGeneratedIndex.toString()}</span>
            </div>
          </div>
        ) : null}

        <div className="w-80 overflow-y-auto mt-1">
          <TreeView selected={currentFile.file} hideLabel>
            {Object.entries(fileSystem).map(([folder, folderData]) =>
              renderTreeNodes(folder, folderData),
            )}
          </TreeView>
        </div>
      </div>
      <Splitter onDrag={handleDrag} />
      <div className="w-full min-w-0 flex flex-col">
        <span className="text-md text-gray-30 mt-2">
          {currentFile.path ? <span>{currentFile.path}</span> : null}
        </span>
        {fileSystem === null ? (
          <div>Loading...</div>
        ) : (
          currentFile &&
          currentFile.path && (
          <div className="relative overflow-y-auto mt-6 px-5">
              {console.log("Current file path:", currentFile.path)}
              {currentFile.path.endsWith("computations.py") ? (
                <ComputationsFileEditor fetchFileSystem={fetchFileSystem} />
              ) : ["specs_v1.json", "run_test.py"].some(fileName =>
                currentFile.path.endsWith(fileName)) ? (
                <ViewerCodeMirror
                  className="code-block"
                  code={currentFile.content || ""}
                />
              ) : (
                <>
                  <EditorCodeMirror
                    key={currentFile.path}
                    code={currentFile.content || ""}
                    onChange={(newValue) => onChange(newValue)}
                  />
                  <div className="absolute right-8 top-2">
                    <Button
                      renderIcon={Save}
                      iconDescription="Save code"
                      tooltipPosition="left"
                      hasIconOnly
                      size="md"
                      onClick={saveChanges}
                    />
                  </div>
                </>
              )}
            </div>
          )
        )}
      </div>
      <Modal
        open={isModalOpen}
        modalHeading="Unsaved Changes"
        primaryButtonText="Save Changes"
        secondaryButtonText="Cancel"
        onRequestSubmit={handleModalConfirm}
        onRequestClose={handleModalCancel}
        size="xs"
      >
        <p>You have unsaved changes. Do you want to save them?</p>
      </Modal>
    </div>
  );
  }
}
