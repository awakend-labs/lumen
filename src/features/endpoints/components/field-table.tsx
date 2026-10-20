import type { ParamField } from "@/lib/types";
import { CheckIcon, MinusIcon } from "lucide-react";
import { ParameterTable, parameterRowClass } from "./parameter-table";

export function FieldTable({ fields, label = "Fields", headers = false, fieldLabel = "Field" }: { fields: ParamField[]; label?: string; headers?: boolean; fieldLabel?: string }) {
  if (!fields.length) return <p className="text-sm text-muted-foreground">No fields documented.</p>;
  const cellClass = "border-l border-primary/10 p-3 align-top break-words [overflow-wrap:anywhere]";
  return <ParameterTable label={label} columns={[
    { label: headers ? "Header" : fieldLabel, width: "w-[22%]" },
    ...(!headers ? [{ label: "Type", width: "w-28" }] : []),
    { label: headers ? "Value" : "Example", width: "w-[24%]" },
    { label: "Description / constraints" },
    { label: "Required", width: "w-24", centered: true },
  ]}>
      {fields.map((field, index) => <tr key={`${field.key}-${index}`} className={parameterRowClass(index)}>
        <td className="p-3 align-top font-mono break-all">{field.key}</td>
        {!headers && <td className={`${cellClass} font-mono text-xs`}>{field.type ?? "string"}</td>}
        <td className={`${cellClass} font-mono text-xs leading-6 whitespace-pre-wrap`}>{field.value || <span className="text-muted-foreground">—</span>}</td>
        <td className={cellClass}><p className="whitespace-pre-wrap">{field.description || "—"}</p><div className="mt-1 space-y-1 text-xs text-muted-foreground">
          {field.enum?.length ? <p>Enum: {field.enum.join(", ")}</p> : null}
          {field.default !== undefined && field.default !== "" && <p>Default: {field.default}</p>}
          {field.format && <p>Format: {field.format}</p>}
          {field.min !== undefined && <p>Min: {field.min}</p>}{field.max !== undefined && <p>Max: {field.max}</p>}
        </div></td>
        <td className={`${cellClass} text-center`}><span className="inline-flex items-center gap-1.5 text-xs">
          {field.required ? <CheckIcon aria-hidden className="size-3.5 text-accent-foreground dark:text-primary/85" /> : <MinusIcon aria-hidden className="size-3.5 text-muted-foreground" />}
          {field.required ? "Yes" : "No"}
        </span></td>
      </tr>)}
  </ParameterTable>;
}

export function schemaFields(schema: unknown, prefix = "", depth = 0): ParamField[] {
  if (!schema || typeof schema !== "object" || Array.isArray(schema) || depth > 12) return [];
  const node = schema as Record<string, unknown>;
  if (node.type === "array") return schemaFields(node.items, `${prefix}[]`, depth + 1);
  if (!node.properties || typeof node.properties !== "object") return [];
  return Object.entries(node.properties).flatMap(([name, raw]) => {
    if (!raw || typeof raw !== "object") return [];
    const field = raw as Record<string, unknown>;
    const key = prefix ? `${prefix}.${name}` : name;
    return [{ key, value: "", type: (typeof field.type === "string" ? field.type : "object") as ParamField["type"], required: Array.isArray(node.required) && node.required.includes(name), description: typeof field.description === "string" ? field.description : "", enum: Array.isArray(field.enum) ? field.enum.map(String) : undefined, default: field.default === undefined ? undefined : JSON.stringify(field.default), format: typeof field.format === "string" ? field.format : undefined, min: typeof field.minimum === "number" ? field.minimum : typeof field.minLength === "number" ? field.minLength : undefined, max: typeof field.maximum === "number" ? field.maximum : typeof field.maxLength === "number" ? field.maxLength : undefined }, ...schemaFields(field, key, depth + 1)];
  });
}

export function requestBodyFields(fields: ParamField[] | undefined, schema: unknown): ParamField[] {
  const fromSchema = schemaFields(schema);
  const schemaByKey = new Map(fromSchema.map(field => [field.key, field]));
  const documented = (fields ?? []).map(field => {
    const contract = schemaByKey.get(field.key);
    return contract ? { ...contract, ...field, type: contract.type ?? field.type,
      description: field.description || contract.description,
      required: contract.required || field.required,
    } : field;
  });
  const documentedByKey = new Map(documented.map(field => [field.key, field]));
  return [
    ...fromSchema.map(field => documentedByKey.get(field.key) ?? field),
    ...documented.filter(field => !schemaByKey.has(field.key)),
  ];
}
