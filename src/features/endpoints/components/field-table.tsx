import type { ParamField } from "@/lib/types";

export function FieldTable({ fields }: { fields: ParamField[] }) {
  if (!fields.length) return <p className="text-sm text-muted-foreground">No fields documented.</p>;
  return <div className="max-w-full overflow-x-auto rounded-lg border border-border/30 dark:border-white/5">
    <table className="w-full text-left text-sm">
      <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>{["Field", "Type", "Required", "Description / constraints"].map(label => <th key={label} className="p-3 font-medium">{label}</th>)}</tr></thead>
      <tbody>{fields.map((field, index) => <tr key={`${field.key}-${index}`} className="border-t border-border/30 align-top dark:border-white/5">
        <td className="break-all p-3 font-mono">{field.key}</td><td className="p-3 font-mono">{field.type ?? "string"}</td><td className="p-3">{field.required ? "Yes" : "No"}</td>
        <td className="min-w-48 break-words p-3"><p>{field.description || "—"}</p><div className="mt-1 space-y-1 text-xs text-muted-foreground">
          {field.enum?.length ? <p>Enum: {field.enum.join(", ")}</p> : null}
          {field.default !== undefined && field.default !== "" && <p>Default: {field.default}</p>}
          {field.format && <p>Format: {field.format}</p>}
          {field.min !== undefined && <p>Min: {field.min}</p>}{field.max !== undefined && <p>Max: {field.max}</p>}
          {field.value && <p>Example: {field.value}</p>}
        </div></td>
      </tr>)}</tbody>
    </table>
  </div>;
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
  const keys = new Set(documented.map(field => field.key));
  return [...documented, ...fromSchema.filter(field => !keys.has(field.key))];
}
