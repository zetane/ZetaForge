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
  PlayFilled,
  Save,
} from "@carbon/icons-react";
import { Button, Modal, TreeNode, TreeView } from "@carbon/react";
import { useAtom } from 'jotai';
import { useImmerAtom } from 'jotai-immer';
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorCodeMirror } from "./CodeMirrorComponents";
import Splitter from "./Splitter";

function DirectoryViewer({
  fileSystemProp,
  blockPath,
  lastGeneratedIndex,
  handleDockerCommands,
  fetchFileSystem,
  blockFolderName,
}) {
  const serverAddress = "http://localhost:3330";
  const [fileSystem, setFileSystem] = useState({});
  const [currentFile, setCurrentFile] = useState({});
  const [navWidth, setNavWidth] = useState(300); // Initial width of the navigation pane
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [editor] = useAtom(drawflowEditorAtom);
  const [compilationErrorToast, setCompilationErrorToast] = useAtom(compilationErrorToastAtom)

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const compileComputation = trpc.compileComputation.useMutation();
  const saveBlockSpecs = trpc.saveBlockSpecs.useMutation();

  // let generated_from_index = '';

  useEffect(() => {
    setFileSystem(fileSystemProp);
  }, [fileSystemProp]);

  const handleFileImport = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const files = event.target.files;
    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]); // Append files only
      formData.append("paths", files[i].name); // Use file name as path
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
      formData.append("files", files[i]); // Append files
      formData.append("paths", files[i].webkitRelativePath); // Use relative path
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

  const handleModalConfirm = (e) => {
    saveChanges(e);
    if (pendingFile) {
      // Split the path and navigate through the file system
      const relPath = pendingFile.replaceAll('\\', '/')
      const pathSegments = relPath.split("/");
      let fileContent = fileSystem;

      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];
        if (i === pathSegments.length - 1) {
          // Last segment, this is the file
          fileContent = fileContent[segment].content;
        } else {
          // Navigate deeper into the directory structure
          fileContent = fileContent[segment].content;
        }
      }

      setCurrentFile({ path: pendingFile, content: fileContent });
    }
    setIsModalOpen(false);
    setPendingFile(null); // Reset pending file state
  };

  // Function to handle modal cancel
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
          // Safety check to prevent accessing properties of undefined
          return fileSystem;
        }

        const [currentSegment, ...remainingSegments] = pathSegments;
        if (!fileSystem[currentSegment]) {
          // If the current segment does not exist in the file system
          console.error(
            `No such folder: ${currentSegment} in path ${folderPath}`,
          );
          return fileSystem;
        }

        if (!remainingSegments.length) {
          // If this is the target folder
          return {
            ...fileSystem,
            [currentSegment]: {
              ...fileSystem[currentSegment],
              expanded: !fileSystem[currentSegment].expanded,
            },
          };
        } else {
          // If there are more segments, continue the recursion
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
    setUnsavedChanges(true); // Indicate that there are unsaved changes

    // Update currentFile with the new content
    setCurrentFile((prevCurrentFile) => ({
      ...prevCurrentFile,
      content: newValue,
    }));

    // Update the fileSystem state to reflect the change in the file's content
    setFileSystem((prevFileSystem) => {
      const relPath = currentFile.path.replaceAll('\\', '/')
      const pathSegments = relPath.split("/");
      let updatedFileSystem = { ...prevFileSystem };

      let currentLevel = updatedFileSystem;
      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];

        if (i === pathSegments.length - 1) {
          // If it's the file, update its content
          currentLevel[segment] = {
            ...currentLevel[segment],
            content: newValue,
          };
        } else {
          // Navigate deeper into the directory structure
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
    // Check if there is a current file selected
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
      "computations.py",
    ];

    const isSpecialFile = specialFiles.includes(folder);
    const textStyle = isSpecialFile ? { color: "darkorange" } : {};

    const handleFileClick = (filePath) => {
      // Check for unsaved changes as before
      if (unsavedChanges) {
        setPendingFile(filePath);
        setIsModalOpen(true);
      } else {
        if (filePath.endsWith(".html")) {
          // Open HTML file in a new tab
          const fileContent = folderData.content; // Assuming this is your file content
          const blob = new Blob([fileContent], { type: "text/html" });
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank");
        } else {
          // Existing logic for non-HTML files
          setCurrentFile({ path: filePath, content: folderData.content });
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
            tooltipPosition="bottom"
            hasIconOnly
            onClick={handleFolderImport}
            title="Import folder into your block folder"
          >
            Import Folder
          </Button>
          <Button
            renderIcon={DocumentDownload}
            size="sm"
            iconDescription="Import files"
            tooltipPosition="bottom"
            hasIconOnly
            onClick={handleFileImport}
            title="Import files into your block folder"
          >
            Import Files
          </Button>

          <Button
            renderIcon={PlayFilled}
            iconDescription="Run test"
            tooltipPosition="bottom"
            hasIconOnly
            size="sm"
            onClick={handleDockerCommands}
            title="Run test from this block folder"
          >
            Run
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

        <div className="w-64">
          <TreeView selected={currentFile.file} label="">
            {Object.entries(fileSystem).map(([folder, folderData]) =>
              renderTreeNodes(folder, folderData),
            )}
          </TreeView>
        </div>
      </div>
      <Splitter onDrag={handleDrag} />
      <div className="w-full min-w-0 flex flex-col">
        <span className="text-xl text-gray-30">
          {currentFile.path ? <span>{currentFile.path}</span> : null}
        </span>
        {fileSystem === null ? (
          <div>Loading...</div>
        ) : (
          currentFile &&
          currentFile.path && (
            <div className="relative overflow-y-auto grow">
              <EditorCodeMirror
                key={currentFile.path}
                code={currentFile.content || ""}
                onChange={(newValue) => onChange(newValue)}
              />
              <div className="absolute right-0 top-0">
                <Button
                  renderIcon={Save}
                  iconDescription="Save code"
                  hasIconOnly
                  size="md"
                  kind="ghost"
                  onClick={saveChanges}
                />
              </div>
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

export default DirectoryViewer;
