import DirectoryNode from "./DirectoryNode";
import FileNode from "./FileNode";

export default function DirectoryEntryNode({
  tree,
  isRoot,
  onSelectFile,
  ...rest
}) {
  return tree.children ? (
    <DirectoryNode
      tree={tree}
      isRoot={isRoot}
      onSelectFile={onSelectFile}
      {...rest}
    />
  ) : (
    <FileNode
      tree={tree}
      onSelectFile={onSelectFile}
      {...rest}
    />
  );
}
