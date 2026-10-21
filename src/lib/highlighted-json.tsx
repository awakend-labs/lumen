import { memo } from "react";
const TOKEN =
  /"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b|[{}[\],:]/g;

type JsonTokenKind = "key" | "string" | "number" | "literal" | "punct";

function tokenizeJson(source: string) {
  const parts: { text: string; kind?: JsonTokenKind }[] = [];
  let last = 0;
  for (const match of source.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: source.slice(last, index) });
    const text = match[0];
    let kind: JsonTokenKind = "punct";
    if (text.startsWith('"')) {
      kind = /^\s*:/.test(source.slice(index + text.length)) ? "key" : "string";
    } else if (text === "true" || text === "false" || text === "null") {
      kind = "literal";
    } else if (text !== "{" && text !== "}" && text !== "[" && text !== "]" && text !== "," && text !== ":") {
      kind = "number";
    }
    parts.push({ text, kind });
    last = index + text.length;
  }
  if (last < source.length) parts.push({ text: source.slice(last) });
  return parts;
}

export const HighlightedJson = memo(function HighlightedJson({ text }: { text: string }) {
  return tokenizeJson(text).map((part, index) =>
    part.kind ? (
      <span key={index} className={`json-${part.kind}`}>
        {part.text}
      </span>
    ) : (
      part.text
    ),
  );
});
