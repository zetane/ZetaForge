import DirectoryNode from "./DirectoryNode";
import FileNode from "./FileNode";

export default function DirectoryEntryNode({ tree, isRoot, ...rest }) {
  return tree.children ? (
    <DirectoryNode tree={tree} isRoot={isRoot} {...rest} />
  ) : (
    <FileNode tree={tree} {...rest} />
  );
}
