import { HTTP_METHODS, type EndpointRecord, type HttpMethod, type ParamField, type ProjectAuth, type RequestBodyDoc } from "./types";
import { endpointUrl, pathParameterNames, splitVersionPath, validEndpointPath } from "./endpoint-path";
import { stringifyJson } from "./json-source";
import { resolveEndpointAuth } from "./endpoint-auth";

export type CurlDraft = Pick<EndpointRecord, "name" | "method" | "baseUrl" | "path" | "headers" | "queryParams" | "pathParams" | "requestBody" | "access" | "version">;

/** Tokenize text only. Never execute a shell, expand variables, or read files. */
export function curlTokens(command: string): string[] {
  if (command.length > 50000) throw new Error("Keep the command under 50,000 characters.");
  const text = command.replace(/(?:\\|\^|`)\r?\n/g, "");
  const tokens: string[] = [];
  let value = "", quote = "", started = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote === "'") {
      if (char === "'") quote = ""; else value += char;
    } else if (char === "\\" && quote !== "'") {
      const next = text[i + 1];
      if (next === undefined) throw new Error("The command ends with an incomplete escape.");
      if (!quote || ['"', "\\", "$", "`"].includes(next)) { value += next; i++; }
      else value += char;
      started = true;
    } else if (quote) {
      if (char === quote) quote = ""; else value += char;
    } else if (char === "'" || char === '"') {
      quote = char; started = true;
    } else if (/\s/.test(char)) {
      if (started) { tokens.push(value); value = ""; started = false; }
    } else {
      if (/[;|<>]/.test(char)) throw new Error("Paste one cURL command without shell operators or redirections.");
      value += char; started = true;
    }
  }
  if (quote) throw new Error("Close the quoted string in your command.");
  if (started) tokens.push(value);
  return tokens;
}

const sensitiveKey = /^(?:authorization|proxy-authorization|cookie|x-api-key|api[-_]?key|access[-_]?token|refresh[-_]?token|token|client[-_]?secret|password|secret)$/i;
const placeholder = (key: string) => `YOUR_${key.replace(/[^a-z0-9]/gi, "_").toUpperCase()}`;

function headerValue(key: string, value: string) {
  if (!sensitiveKey.test(key)) return value;
  if (/authorization$/i.test(key)) {
    const scheme = value.match(/^([A-Za-z][A-Za-z0-9_-]*)\s+/)?.[1];
    if (scheme?.toLowerCase() === "basic") return "Basic YOUR_BASE64_CREDENTIALS";
    return scheme ? `${scheme} YOUR_TOKEN` : "YOUR_AUTHORIZATION";
  }
  return placeholder(key);
}

function parameters(values: URLSearchParams): ParamField[] {
  return [...new Set(values.keys())].map(key => {
    const all = values.getAll(key).map(value => sensitiveKey.test(key) ? placeholder(key) : value);
    return { key, value: all.length > 1 ? JSON.stringify(all) : all[0], type: all.length > 1 ? "array" : "string", required: false, description: "" };
  });
}

export function parseCurl(command: string): CurlDraft {
  const tokens = curlTokens(command.trim());
  if (!/^curl(?:\.exe)?$/i.test(tokens.shift() ?? "")) throw new Error("Start your command with curl or curl.exe.");
  let address = "", explicitMethod = "", head = false, get = false, json = false;
  const headers: ParamField[] = [], data: string[] = [], forms = new URLSearchParams();
  let hasData = false, hasForms = false;
  function addHeader(key: string, value: string) {
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(key) || /[\r\n]/.test(value)) throw new Error("Each header needs a valid name and a single-line value.");
    const existing = headers.find(header => header.key.toLowerCase() === key.toLowerCase());
    const safe = headerValue(key, value);
    if (existing) existing.value = safe; else headers.push({ key, value: safe, type: "string", required: true, description: "" });
  }
  function setUrl(value: string) {
    if (address) throw new Error("Import one URL at a time.");
    address = value;
  }
  for (let i = 0; i < tokens.length; i++) {
    let flag = tokens[i], inline: string | undefined;
    if (flag.startsWith("--") && flag.includes("=")) { const at = flag.indexOf("="); inline = flag.slice(at + 1); flag = flag.slice(0, at); }
    else if (/^-[XHdbuAF].+/.test(flag)) { inline = flag.slice(2); flag = flag.slice(0, 2); }
    const next = () => {
      const value = inline ?? tokens[++i];
      if (value === undefined) throw new Error(`${flag} needs a value.`);
      return value;
    };
    if (["-X", "--request"].includes(flag)) explicitMethod = next().toUpperCase();
    else if (["-H", "--header"].includes(flag)) {
      const value = next(), at = value.indexOf(":");
      if (at < 1) throw new Error("Write headers as 'Header-Name: value'.");
      addHeader(value.slice(0, at).trim(), value.slice(at + 1).trim());
    } else if (flag === "--url") setUrl(next());
    else if (["-d", "--data", "--data-ascii", "--data-binary", "--data-raw", "--json", "--data-urlencode"].includes(flag)) {
      const value = next();
      if (flag !== "--data-raw" && value.startsWith("@")) throw new Error("File references aren't supported. Paste the request body directly.");
      hasData = true;
      if (flag === "--json") json = true;
      if (flag === "--data-urlencode") {
        const at = value.indexOf("=");
        if (at < 1) throw new Error("Use --data-urlencode 'name=value'; file references aren't supported.");
        data.push(`${value.slice(0, at)}=${encodeURIComponent(value.slice(at + 1))}`);
      } else data.push(value);
    } else if (["-F", "--form", "--form-string"].includes(flag)) {
      const value = next(), at = value.indexOf("=");
      if (at < 1) throw new Error("Write form fields as 'name=value'.");
      if (flag !== "--form-string" && /^(?:@|<)|;type=/.test(value.slice(at + 1))) throw new Error("File uploads aren't supported. Import literal form fields instead.");
      hasForms = true; forms.append(value.slice(0, at), value.slice(at + 1));
    } else if (["-u", "--user"].includes(flag)) { next(); addHeader("Authorization", "Basic credentials"); }
    else if (flag === "--oauth2-bearer") { next(); addHeader("Authorization", "Bearer token"); }
    else if (["-b", "--cookie"].includes(flag)) { next(); addHeader("Cookie", "cookie"); }
    else if (["-A", "--user-agent"].includes(flag)) addHeader("User-Agent", next());
    else if (["-G", "--get"].includes(flag)) get = true;
    else if (["-I", "--head"].includes(flag)) head = true;
    else if (["--location", "--silent", "--show-error", "--compressed", "--insecure", "--globoff", "--verbose", "--include", "--basic", "--http1.1", "--http2"].includes(flag) || /^-[LsSkvgif46]+$/.test(flag)) { /* Transport-only flags do not affect endpoint documentation. */ }
    else if (flag.startsWith("-")) throw new Error(`The ${flag} option isn't supported. Remove it before importing.`);
    else setUrl(flag);
  }
  if (!address) throw new Error("Add a URL to your cURL command.");
  if (address.startsWith("//")) throw new Error("Include http:// or https:// in the server URL.");
  if (hasData && hasForms) throw new Error("Use a data body or multipart form fields, rather than both.");
  let url: URL;
  try { url = new URL(address, address.startsWith("/") ? "https://api.example.com" : undefined); }
  catch { throw new Error("Enter an HTTP or HTTPS URL, such as https://api.example.com/users."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS endpoints are supported.");
  if (url.username || url.password) addHeader("Authorization", "Basic credentials");
  const method = explicitMethod || (head ? "HEAD" : get ? "GET" : hasData || hasForms ? "POST" : "GET");
  if (!HTTP_METHODS.includes(method as HttpMethod)) throw new Error("Choose a supported HTTP method, such as GET, POST, PUT, PATCH, or DELETE.");
  const raw = data.join(json ? "" : "&");
  if (get && hasData) for (const [key, value] of new URLSearchParams(raw)) url.searchParams.append(key, value);
  const fullPath = url.pathname.replace(/%7B([A-Za-z_][A-Za-z0-9_]*)%7D/gi, "{$1}");
  const versioned = splitVersionPath(fullPath);
  const path = versioned?.path ?? fullPath;
  if (!validEndpointPath(path)) throw new Error("The URL path cannot be documented. Use a single route without URL globbing.");
  let requestBody: RequestBodyDoc = null;
  const contentHeader = headers.find(header => header.key.toLowerCase() === "content-type");
  if (hasForms) {
    requestBody = { contentType: "multipart/form-data", example: Object.fromEntries(parameters(forms).map(field => [field.key, field.type === "array" ? JSON.parse(field.value) : field.value])) };
    if (contentHeader) headers.splice(headers.indexOf(contentHeader), 1); // cURL supplies the multipart boundary.
  } else if (hasData && !get) {
    const contentType = json ? "application/json" : contentHeader?.value.split(";")[0].trim().toLowerCase() || "application/x-www-form-urlencoded";
    if (contentType === "application/json" || contentType.endsWith("+json")) {
      try { requestBody = { contentType: "application/json", example: JSON.parse(raw), exampleSource: raw }; }
      catch { throw new Error("The JSON request body isn't valid. Correct it before importing."); }
    } else if (contentType === "application/x-www-form-urlencoded") {
      requestBody = { contentType, example: Object.fromEntries(parameters(new URLSearchParams(raw)).map(field => [field.key, field.type === "array" ? JSON.parse(field.value) : field.value])) };
    } else requestBody = { contentType: "text/plain", raw };
    if (!contentHeader) addHeader("Content-Type", requestBody.contentType!);
    if (json && !headers.some(header => header.key.toLowerCase() === "accept")) addHeader("Accept", "application/json");
  }
  const authenticated = headers.some(header => sensitiveKey.test(header.key)) || [...url.searchParams.keys()].some(key => sensitiveKey.test(key));
  return {
    name: `${method} ${path}`.slice(0, 120), method: method as HttpMethod,
    version: versioned?.version ?? "",
    baseUrl: (address.startsWith("/") ? (versioned?.prefix ? "https://api.example.com" : "") : url.origin) + (versioned?.prefix ?? ""),
    path, headers, queryParams: parameters(url.searchParams),
    pathParams: pathParameterNames(path).map(key => ({ key, value: "", type: "string", required: true, description: "" })),
    requestBody, access: authenticated ? "authenticated" : "public",
  };
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function sampleValue(field: ParamField): unknown {
  const value = field.value || field.default || field.enum?.[0];
  if (value !== undefined && value !== "") {
    if (["integer", "number", "boolean", "object", "array"].includes(field.type ?? "")) {
      try { return JSON.parse(value); } catch { /* Keep documented text if it isn't JSON. */ }
    }
    return value;
  }
  if (field.type === "integer" || field.type === "number") return field.min ?? 0;
  if (field.type === "boolean") return true;
  if (field.type === "object") return {};
  if (field.type === "array") return [];
  if (field.type === "uuid" || field.format === "uuid") return "550e8400-e29b-41d4-a716-446655440000";
  return field.format === "email" ? "you@example.com" : "example";
}

function schemaExample(schema: unknown, depth = 0): unknown {
  if (!schema || typeof schema !== "object" || depth > 5) return {};
  const value = schema as Record<string, unknown>;
  if (value.example !== undefined) return value.example;
  if (value.default !== undefined) return value.default;
  if (Array.isArray(value.enum) && value.enum.length) return value.enum[0];
  if (value.properties && typeof value.properties === "object") return Object.fromEntries(Object.entries(value.properties).map(([key, child]) => [key, schemaExample(child, depth + 1)]));
  if (value.type === "array") return [schemaExample(value.items, depth + 1)];
  return sampleValue({ key: "", value: "", required: false, description: "", type: value.type as ParamField["type"], format: value.format as string });
}

export function generateCurl(endpoint: Pick<EndpointRecord, "method" | "path" | "baseUrl" | "headers" | "queryParams" | "pathParams" | "requestBody" | "access"> & { version?: string; authScheme?: EndpointRecord["authScheme"] }, auth?: ProjectAuth): string {
  auth = resolveEndpointAuth(endpoint, auth);
  const path = endpoint.path.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}|:([A-Za-z_][A-Za-z0-9_]*)/g, (_, brace, colon) => {
    const key = brace ?? colon, field = endpoint.pathParams.find(item => item.key === key);
    return encodeURIComponent(field?.value || field?.default || placeholder(key));
  });
  const url = endpointUrl(endpoint.baseUrl, path, endpoint.version);
  for (const field of endpoint.queryParams) {
    if (!field.required && !field.value.trim()) continue;
    let values = [field.value || field.default || placeholder(field.key)];
    if (field.type === "array" && field.value) {
      try { const parsed = JSON.parse(field.value); if (Array.isArray(parsed)) values = parsed.map(String); } catch { /* Use the literal example. */ }
    }
    for (const value of values) url.searchParams.append(field.key, value);
  }
  const headers = endpoint.headers.filter(header => {
    // Optional credential examples defer to the endpoint's effective auth scheme.
    // Edited values and explicitly required headers remain authoritative.
    if (header.required) return true;
    const key = header.key.toLowerCase();
    if (key === "authorization" && ["Bearer YOUR_TOKEN", "Basic YOUR_BASE64_CREDENTIALS", "YOUR_AUTHORIZATION"].includes(header.value)) return false;
    if (key === "cookie" && /^(?:YOUR_COOKIE|[^=;\s]+=YOUR_SESSION_TOKEN)$/.test(header.value)) return false;
    return true;
  }).map(header => ({ key: header.key, value: header.value || header.default || placeholder(header.key) }));
  const hasHeader = (key: string) => headers.some(header => header.key.toLowerCase() === key.toLowerCase());
  if (endpoint.access !== "public" && auth) {
    if (auth.scheme === "bearer" && !hasHeader("Authorization")) headers.push({ key: "Authorization", value: "Bearer YOUR_TOKEN" });
    if (auth.scheme === "basic" && !hasHeader("Authorization")) headers.push({ key: "Authorization", value: "Basic YOUR_BASE64_CREDENTIALS" });
    if (auth.scheme === "session_token" && !hasHeader("Cookie")) headers.push({ key: "Cookie", value: `${auth.headerName}=YOUR_SESSION_TOKEN` });
    if (auth.scheme === "api_key") {
      if (auth.location === "query" && !url.searchParams.has(auth.headerName)) url.searchParams.set(auth.headerName, "YOUR_API_KEY");
      else if (auth.location === "header" && !hasHeader(auth.headerName)) headers.push({ key: auth.headerName, value: "YOUR_API_KEY" });
    }
  }
  const body = endpoint.requestBody;
  const type = body?.contentType || "application/json";
  if (body && type !== "multipart/form-data" && !hasHeader("Content-Type")) headers.push({ key: "Content-Type", value: type });
  const parts = [`curl --request ${endpoint.method} ${shellQuote(url.toString())}`];
  if (endpoint.method === "HEAD") parts.push("--head");
  for (const header of headers) {
    if (type === "multipart/form-data" && header.key.toLowerCase() === "content-type") continue;
    parts.push(`--header ${shellQuote(`${header.key}: ${header.value}`)}`);
  }
  if (body) {
    const example = body.example !== undefined ? body.example : body.fields?.length
      ? Object.fromEntries(body.fields.map(field => [field.key, sampleValue(field)])) : schemaExample(body.schema);
    if (type === "application/x-www-form-urlencoded" || type === "multipart/form-data") {
      if (example && typeof example === "object") for (const [key, value] of Object.entries(example)) {
        for (const item of Array.isArray(value) ? value : [value]) parts.push(`${type === "multipart/form-data" ? "--form-string" : "--data-urlencode"} ${shellQuote(`${key}=${typeof item === "object" ? JSON.stringify(item) : String(item)}`)}`);
      }
    } else if (type === "text/plain") parts.push(`--data-raw ${shellQuote(body.raw ?? "")}`);
    else parts.push(`--data-raw ${shellQuote(stringifyJson(example, body.exampleSource))}`);
  }
  return parts.join(" \\\n  ");
}
