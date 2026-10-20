import type { HttpMethod, ResponseDoc, ResponseErrorFormat } from "./types";

export type ResponseSchema = { [key: string]: unknown; type?: string | string[]; properties?: Record<string, ResponseSchema>; required?: string[]; items?: ResponseSchema; anyOf?: ResponseSchema[]; oneOf?: ResponseSchema[]; allOf?: ResponseSchema[] };

export function inferResponseSchema(value: unknown): ResponseSchema {
  if (value === null) return { type: "null" };
  if (Array.isArray(value)) return { type: "array", items: mergeSchemas(value.map(inferResponseSchema)) };
  if (typeof value === "object" && value) {
    return { type: "object", properties: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, inferResponseSchema(item)])), required: Object.keys(value) };
  }
  return { type: typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "string" };
}

function mergeSchemas(schemas: ResponseSchema[]): ResponseSchema {
  if (!schemas.length) return {};
  const groups = new Map<string, ResponseSchema[]>();
  for (const schema of schemas) { const key = String(schema.type); groups.set(key, [...(groups.get(key) ?? []), schema]); }
  const alternatives = [...groups].map(([type, group]): ResponseSchema => {
    if (type === "array") return { type, items: mergeSchemas(group.map(schema => schema.items ?? {})) };
    if (type !== "object") return group[0];
    const keys = [...new Set(group.flatMap(schema => Object.keys(schema.properties ?? {})))];
    return { type, properties: Object.fromEntries(keys.map(key => [key, mergeSchemas(group.flatMap(schema => schema.properties && Object.hasOwn(schema.properties, key) ? [schema.properties[key]] : []))])), required: keys.filter(key => group.every(schema => schema.required?.includes(key))) };
  });
  if (alternatives.length === 1) return alternatives[0];
  return alternatives.every(schema => !schema.properties && !schema.items) ? { type: alternatives.map(schema => schema.type as string) } : { anyOf: alternatives };
}

export function responseSuccessCode(responses: ResponseDoc[], method: HttpMethod): number | undefined {
  const success = responses.filter(response => response.statusCode >= 200 && response.statusCode < 300);
  return (success.find(response => response.isSuccess) ?? success.find(response => response.statusCode === (method === "POST" ? 201 : 200)) ?? success[0])?.statusCode;
}

export function resolveResponse(response: ResponseDoc, shared?: ResponseErrorFormat | null): ResponseDoc {
  return response.useSharedError && response.statusCode >= 400 && shared
    ? { ...response, body: shared.body, bodySource: shared.bodySource, schema: shared.schema ?? inferResponseSchema(shared.body), schemaSource: shared.schemaSource }
    : { ...response, schema: response.schema ?? (response.body !== undefined ? inferResponseSchema(response.body) : undefined) };
}

export function asResponseSchema(value: unknown): ResponseSchema {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ResponseSchema : {};
}

function dereference(schema: ResponseSchema, root: ResponseSchema): ResponseSchema {
  if (typeof schema.$ref !== "string" || !schema.$ref.startsWith("#/")) return schema;
  let target: unknown = root;
  for (const key of schema.$ref.slice(2).split("/").map(key => key.replace(/~1/g, "/").replace(/~0/g, "~"))) {
    if (!target || typeof target !== "object" || !Object.hasOwn(target, key)) return schema;
    target = (target as Record<string, unknown>)[key];
  }
  return asResponseSchema(target);
}

export type ContractField = { path: string; depth: number; type: string; required: boolean; description?: string };

export function responseContractFields(value: unknown): ContractField[] {
  const root = asResponseSchema(value), fields: ContractField[] = [];
  function visit(input: ResponseSchema, path: string, depth: number, required: boolean, ancestors: Set<ResponseSchema>) {
    const node = dereference(input, root);
    const next = new Set(ancestors).add(node);
    const variants = node.anyOf ?? node.oneOf;
    const types = variants ? variants.flatMap(item => schemaTypeNames(item)) : schemaTypeNames(node);
    fields.push({ path: path || "$", depth, type: [...new Set(types)].join(" or "), required, description: typeof node.description === "string" ? node.description : undefined });
    if (depth > 16 || ancestors.has(node)) return;
    const object = node.properties ? node : variants?.find(item => item.properties);
    for (const [key, child] of Object.entries(object?.properties ?? {})) visit(child, path ? `${path}.${key}` : key, depth + (path ? 1 : 0), Boolean(object?.required?.includes(key)), next);
    const items = node.items ?? variants?.find(item => item.items)?.items;
    if (items) visit(items, `${path || "$"}[]`, depth + 1, true, next);
  }
  visit(root, "", 0, true, new Set());
  return fields;
}

function schemaTypeNames(schema: ResponseSchema): string[] {
  if (!schema.type && Array.isArray(schema.enum)) return [...new Set(schema.enum.map(value => value === null ? "null" : typeof value))];
  let types = Array.isArray(schema.type) ? schema.type : [schema.type ?? (schema.properties ? "object" : schema.items ? "array" : schema.$ref ? "reference" : "unknown")];
  if (schema.nullable === true && !types.includes("null")) types = [...types, "null"];
  return types;
}

export function responseTypeScript(schema: unknown, typeName = "ResponseBody"): string {
  const root = asResponseSchema(schema);
  function type(input: unknown, depth: number, ancestors: Set<ResponseSchema>): string {
    if (input === false) return "never";
    if (input === true) return "unknown";
    const node = dereference(asResponseSchema(input), root);
    if (depth > 20 || ancestors.has(node) || node.$ref) return "unknown";
    const next = new Set(ancestors).add(node);
    let result: string;
    if (Object.hasOwn(node, "const")) result = JSON.stringify(node.const);
    else if (Array.isArray(node.enum)) result = node.enum.map(value => JSON.stringify(value)).join(" | ") || "never";
    else if (node.anyOf || node.oneOf) result = (node.anyOf ?? node.oneOf)!.map(item => `(${type(item, depth + 1, next)})`).join(" | ");
    else if (node.allOf) result = node.allOf.map(item => `(${type(item, depth + 1, next)})`).join(" & ");
    else {
      const kinds = schemaTypeNames(node);
      result = kinds.map(kind => {
        if (kind === "null") return "null";
        if (kind === "integer" || kind === "number") return "number";
        if (kind === "string" || kind === "boolean") return kind;
        if (kind === "array") return `Array<${type(node.items, depth + 1, next)}>`;
        if (kind !== "object") return "unknown";
        const indent = "  ".repeat(depth + 1), close = "  ".repeat(depth);
        const properties = Object.entries(node.properties ?? {}).map(([key, child]) => `${indent}${JSON.stringify(key)}${node.required?.includes(key) ? "" : "?"}: ${type(child, depth + 1, next)};`);
        if (!properties.length && node.additionalProperties === false) return "Record<string, never>";
        if (!properties.length && node.additionalProperties && typeof node.additionalProperties === "object") return `Record<string, ${type(node.additionalProperties, depth + 1, next)}>`;
        if (node.additionalProperties === true || (node.additionalProperties && typeof node.additionalProperties === "object")) properties.push(`${indent}[key: string]: unknown;`);
        return properties.length ? `{\n${properties.join("\n")}\n${close}}` : "Record<string, unknown>";
      }).join(" | ");
    }
    return node.nullable === true && !result.split(" | ").includes("null") ? `${result} | null` : result;
  }
  const name = typeName.replace(/[^A-Za-z0-9_$]/g, "") || "ResponseBody";
  return `export type ${/^[0-9]/.test(name) ? `Response${name}` : name} = ${type(schema, 0, new Set())};\n`;
}
