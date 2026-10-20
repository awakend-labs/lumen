import { responseContractFields } from "@/lib/response-contract";

export function ResponseFieldTree({ schema }: { schema: unknown }) {
  const rows = responseContractFields(schema);
  const visible = rows.length > 1 && rows[0].type === "object" ? rows.slice(1) : rows;
  return <div className="min-w-0 overflow-hidden rounded-md border border-border/70">
    <div className="border-b border-border/70 bg-muted/25 px-3 py-2.5"><h4 className="text-xs font-semibold">Response fields</h4><p className="mt-1 text-[11px] text-muted-foreground">Required means always present. Null is a separate allowed value.</p></div>
    <div className="max-h-80 overflow-auto [scrollbar-width:thin]">
      <table className="w-full text-left text-xs"><caption className="sr-only">Response field types, required fields, and nullable values</caption><thead className="sr-only"><tr><th>Field</th><th>Type</th><th>Presence</th></tr></thead>
        <tbody>{visible.map((field, index) => <tr key={`${field.path}-${index}`} className="border-b border-border/40 last:border-0">
          <th scope="row" className="px-3 py-3 align-top font-normal"><div style={{ paddingLeft: `${field.depth * 12}px` }}><code className="break-all font-medium text-foreground">{field.path === "$" ? "Response body" : field.path}</code>{field.description && <p className="mt-1 max-w-xs font-sans leading-relaxed text-muted-foreground">{field.description}</p>}</div></th>
          <td className="px-2 py-3 align-top font-mono text-muted-foreground">{field.type}</td><td className="px-3 py-3 text-right align-top text-[10px] text-muted-foreground">{field.required ? "required" : "optional"}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}
