/** Pretty-print valid JSON without changing key order, number precision, or escapes. */
export function formatJson(source: string): string {
  if (!source.trim()) return source;
  JSON.parse(source);
  const tokens = source.match(/"(?:\\.|[^"\\])*"|[{}\[\],:]|[^\s{}\[\],:]+/g) ?? [];
  let depth = 0;
  let output = "";
  const newline = () => "\n" + "  ".repeat(depth);
  tokens.forEach((token, index) => {
    if (token === "{" || token === "[") {
      output += token;
      depth++;
      if (tokens[index + 1] !== (token === "{" ? "}" : "]")) output += newline();
    } else if (token === "}" || token === "]") {
      depth--;
      if (tokens[index - 1] !== (token === "}" ? "{" : "[")) output += newline();
      output += token;
    } else if (token === ",") output += "," + newline();
    else if (token === ":") output += ": ";
    else output += token;
  });
  return output;
}
