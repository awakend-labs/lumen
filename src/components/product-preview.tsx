import { ArrowUpRight, Braces, ChevronDown, CodeXml, Folder, Layers } from "lucide-react";

/** Illustrative content, not an interactive or live project. */
export function ProductPreview({ compact = false }: { compact?: boolean; }) {
  return (
    <figure aria-label="Example API documentation workspace" className="overflow-hidden rounded-md border border-border bg-card text-left shadow-[0_24px_80px_#0000000b]">
      <figcaption className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3 text-[10px] text-muted-foreground">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2 rounded-sm bg-border" />
          <span className="size-2 rounded-sm bg-border" />
          <span className="size-2 rounded-sm bg-primary" />
        </span>
        <span className="font-mono">Lumen / Example workspace</span>
        <span>v1.0</span>
      </figcaption>
      <div className={compact ? "grid grid-cols-1" : "grid sm:grid-cols-[160px_minmax(0,1fr)]"}>
        {!compact && <div className="hidden border-r border-border bg-sidebar/60 p-5 sm:block">
          <div className="mb-9 flex items-center gap-2 text-sm font-semibold">
            <CodeXml className="size-5" />Lumen.</div>
          <p className="eyebrow mb-3">Projects</p>
          <div className="mb-4 flex items-center gap-2 rounded-md bg-card px-3 py-2.5 text-xs font-medium">
            <Folder className="size-3.5" />Commerce</div>
          <div className="ml-3 space-y-4 border-l border-border pl-4 text-xs text-muted-foreground">
            <p>Authentication</p>
            <p className="font-medium text-foreground">Products</p>
            <p>Orders</p>
          </div>
          <p className="mt-16 flex items-center gap-2 text-[10px] text-muted-foreground">
            <Layers className="size-3.5" />3 stashes</p>
        </div>}
        <div className="min-w-0 p-5 sm:p-7">
          <div className="mb-7 flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow mb-2">Commerce API</p>
              <h3 className="text-xl font-semibold tracking-tight">Products</h3>
              <p className="mt-1 text-xs text-muted-foreground">The catalog, clearly documented.</p>
            </div>
            <span className="rounded-sm bg-stash-green/10 px-2.5 py-1 text-[10px] text-stash-green">Active</span>
          </div>
          <div className="overflow-hidden rounded-md border border-border">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3 text-xs font-medium">
              <Braces className="size-4 text-muted-foreground" />Endpoints<span className="ml-auto text-muted-foreground">3</span>
              <ChevronDown className="size-3" />
            </div>{[{ method: "GET", path: "/v1/products", title: "List products", color: "text-method-get bg-method-get/10" }, { method: "POST", path: "/v1/products", title: "Create a product", color: "text-method-post bg-method-post/10" }, { method: "GET", path: "/v1/products/:id", title: "Get a product", color: "text-method-get bg-method-get/10" }].map(({ method, path, title, color }) => <div key={title} className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-0">
              <span className={"w-12 shrink-0 rounded-md py-1 text-center font-mono text-[10px] font-semibold " + color}>{method}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[11px]">{path}</span>
                <span className="mt-1 block text-[10px] text-muted-foreground">{title}</span>
              </span>
              <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
            </div>)}</div>
          <div className="mt-5 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="size-1.5 rounded-sm bg-stash-green" />A shared source of clarity.</div>
        </div>
      </div>
    </figure>
  );
}
