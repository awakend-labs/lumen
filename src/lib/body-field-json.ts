import type { ParamField } from "./types";
import { formatJson } from "./format-json";
import { matchesJsonSource } from "./json-source";

type BodyField = Omit<ParamField, "min" | "max"> & {
  min?: number | string;
  max?: number | string;
  enumValues?: string[];
};

function typedValue(value: string, type: BodyField["type"]): unknown {
  if (type === "string" || type === "uuid" || !type) return value;
  try {
    const parsed: unknown = JSON.parse(value);
    if ((type === "integer" && typeof parsed === "number" && Number.isInteger(parsed)) ||
      (type === "number" && typeof parsed === "number" && Number.isFinite(parsed)) ||
      (type === "boolean" && typeof parsed === "boolean") ||
      (type === "array" && Array.isArray(parsed)) ||
      (type === "object" && parsed !== null && typeof parsed === "object" && !Array.isArray(parsed))) return parsed;
  } catch { /* Keep an explicit example as entered if it is not typed JSON. */ }
  return value;
}

export function bodyFieldsToJson(fields: BodyField[]) {
  const named = fields.filter(field => field.key.trim());
  if (!named.length) return { requestSchema: "", requestExample: "" };
  const properties: Record<string, unknown> = Object.create(null);
  const example: Record<string, unknown> = Object.create(null);
  const exampleSources: Record<string, string> = Object.create(null);
  const required: string[] = [];
  for (const field of named) {
    const key = field.key.trim();
    const type = field.type ?? "string";
    const property: Record<string, unknown> = { type: type === "uuid" ? "string" : type };
    if (field.description.trim()) property.description = field.description;
    if (type === "uuid") property.format = "uuid";
    else if (field.format) property.format = field.format;
    const allowed = field.enumValues ?? field.enum;
    if (allowed?.length) property.enum = allowed.map(value => typedValue(value, type));
    if (field.default !== undefined && field.default !== "") property.default = typedValue(field.default, type);
    const bounds = type === "string" || type === "uuid" ? ["minLength", "maxLength"] : type === "array" ? ["minItems", "maxItems"] : type === "object" ? ["minProperties", "maxProperties"] : ["minimum", "maximum"];
    [field.min, field.max].forEach((value, index) => {
      if (value !== undefined && value !== "" && Number.isFinite(Number(value)) && type !== "boolean") property[bounds[index]] = Number(value);
    });
    properties[key] = property;
    if (field.required && !required.includes(key)) required.push(key);
    const source = field.value !== "" ? field.value : field.default !== undefined && field.default !== "" ? field.default : allowed?.[0];
    example[key] = source !== undefined ? typedValue(source, type)
      : type === "uuid" ? "550e8400-e29b-41d4-a716-446655440000" : type === "integer" || type === "number" ? 0 : type === "boolean" ? false : type === "array" ? [] : type === "object" ? {} : "";
    if (source !== undefined && type !== "string" && type !== "uuid" && matchesJsonSource(example[key], source)) exampleSources[key] = source.trim();
  }
  return {
    requestSchema: JSON.stringify({ type: "object", properties, ...(required.length ? { required } : {}) }, null, 2),
    requestExample: formatJson(`{${Object.keys(example).map(key => `${JSON.stringify(key)}:${exampleSources[key] ?? JSON.stringify(example[key])}`).join(",")}}`),
  };
}

export function sameJson(left: string, right: string) {
  if (left === right) return true;
  try { return formatJson(left) === formatJson(right); }
  catch { return false; }
}
