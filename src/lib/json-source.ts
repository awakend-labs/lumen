import { formatJson } from "./format-json";

function equalJson(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
  return Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(key => Object.hasOwn(b, key) && equalJson(a[key], b[key]));
}

/** Check against structured data, allowing PostgreSQL to reorder object keys. */
export function matchesJsonSource(value: unknown, source: string): boolean {
  try { return equalJson(value, JSON.parse(source)); }
  catch { return false; }
}

/** Preserve authored number spelling instead of serializing numbers again. */
export function stringifyJson(value: unknown, source?: string): string {
  return source && matchesJsonSource(value, source)
    ? formatJson(source)
    : value === undefined ? "" : JSON.stringify(value, null, 2);
}
