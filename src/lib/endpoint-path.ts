export function pathParameterNames(path: string): string[] {
  return [...new Set([...path.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}|:([A-Za-z_][A-Za-z0-9_]*)/g)].map(match => match[1] ?? match[2]))];
}
export function canonicalPath(path: string): string {
  return path.replace(/\{[A-Za-z_][A-Za-z0-9_]*\}|:[A-Za-z_][A-Za-z0-9_]*/g, "{}");
}
export function validEndpointPath(path: string): boolean {
  return path.startsWith("/") && !/[\s#?]/.test(path) &&
    /^\/(?:[A-Za-z0-9._~!$&'()*+,;=@%/-]|[^\p{ASCII}\s\p{C}]|\u200d|\{[A-Za-z_][A-Za-z0-9_]*\}|:[A-Za-z_][A-Za-z0-9_]*)*$/u.test(path) &&
    !/%(?![0-9a-fA-F]{2})/.test(path);
}

/** Separate a URL's version segment from its prefix and resource path. */
export function splitVersionPath(path: string) {
  const match = path.match(/^(.*?)\/(v\d+)(?=\/|$)(.*)$/i);
  return match ? { prefix: match[1], version: match[2].toLowerCase(), path: match[3] || "/" } : null;
}

/** Compose older embedded versions and separate version fields without duplication. */
export function endpointUrl(baseUrl: string, path: string, version = "v1") {
  const url = new URL(baseUrl || "https://api.example.com");
  let base = url.pathname.replace(/\/+$/, "");
  if (!version.trim()) {
    url.pathname = base + (path.startsWith("/") ? path : `/${path}`);
    return url;
  }
  const embedded = splitVersionPath(path);
  const resource = embedded?.path ?? path;
  const prefix = embedded?.prefix ?? "";
  const baseVersion = splitVersionPath(base);
  if (baseVersion) {
    base = `${baseVersion.prefix}/${version}${baseVersion.path === "/" ? "" : baseVersion.path}`;
    if (prefix && !baseVersion.prefix.endsWith(prefix)) base += prefix;
  } else {
    if (prefix && !base.endsWith(prefix)) base += prefix;
    base += `/${version}`;
  }
  url.pathname = base + (resource.startsWith("/") ? resource : `/${resource}`);
  return url;
}
