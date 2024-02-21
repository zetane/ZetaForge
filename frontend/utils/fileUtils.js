
export const getDirectoryPath = (path) => {
  // Check if the path ends with a "/" and remove the last segment
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  // Find the last "/" in the path and remove everything after it
  return path.substring(0, path.lastIndexOf('/') + 1);
}