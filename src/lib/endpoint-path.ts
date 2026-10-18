export function pathParameterNames(path: string): string[] {
  return [...new Set([...path.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}|:([A-Za-z_][A-Za-z0-9_]*)/g)].map(match => match[1] ?? match[2]))];
}
export function canonicalPath(path: string): string {
  return path.replace(/\{[A-Za-z_][A-Za-z0-9_]*\}|:[A-Za-z_][A-Za-z0-9_]*/g, "{}");
}
export function validEndpointPath(path: string): boolean {
  return path.startsWith("/") && !/[\s#?]/.test(path) &&
    /^\/(?:[A-Za-z0-9._~!$&'()*+,;=@%/-]|\{[A-Za-z_][A-Za-z0-9_]*\}|:[A-Za-z_][A-Za-z0-9_]*)*$/.test(path) &&
    !/%(?![0-9a-fA-F]{2})/.test(path);
}
