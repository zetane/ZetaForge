export function buildUrl(scheme, host, port, path) {
  const base = `${scheme}://${host}:${port}`;
  const url = new URL(path, base);
  return url;
}
