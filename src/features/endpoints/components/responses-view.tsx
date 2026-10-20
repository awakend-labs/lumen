"use client";

import { useState } from "react";
import { Code2Icon, StarIcon } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { statusClass } from "@/components/method-badge";
import { stringifyJson } from "@/lib/json-source";
import { resolveResponse, responseSuccessCode, responseTypeScript } from "@/lib/response-contract";
import type { HttpMethod, ResponseDoc, ResponseErrorFormat } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ResponseFieldTree } from "./response-field-tree";

export function ResponsesView({ responses, method, endpointName, shared }: { responses: ResponseDoc[]; method: HttpMethod; endpointName: string; shared?: ResponseErrorFormat | null }) {
  const successCode = responseSuccessCode(responses, method);
  const fallback = String(successCode ?? responses[0]?.statusCode ?? "");
  const [selected, setSelected] = useState(fallback);
  if (!responses.length) return <p className="text-sm text-muted-foreground">No responses documented.</p>;
  return <Tabs value={responses.some(response => String(response.statusCode) === selected) ? selected : fallback} onValueChange={setSelected} className="min-w-0 gap-5">
    <div className="min-w-0 overflow-x-auto overflow-y-hidden border-b border-border/70 pb-1 [scrollbar-width:thin]">
      <TabsList variant="line" aria-label="Response status codes" className="min-h-11 justify-start gap-1">
        {responses.map(response => <TabsTrigger key={response.statusCode} value={String(response.statusCode)} className="min-h-10 flex-none gap-2 px-3">
          <span className={cn("rounded-sm px-1.5 py-0.5 font-mono text-xs", statusClass(response.statusCode))}>{response.statusCode}</span>
          {response.statusCode === successCode && <span className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-primary"><StarIcon className="size-3" aria-hidden />Success</span>}
        </TabsTrigger>)}
      </TabsList>
    </div>
    {responses.map(original => {
      const response = resolveResponse(original, shared);
      const missingShared = original.useSharedError && !shared;
      const noBody = response.statusCode === 204 || response.statusCode === 304 || method === "HEAD";
      const example = response.body !== undefined ? stringifyJson(response.body, response.bodySource) : "";
      const schema = response.schema;
      const typeName = `${endpointName.split(/[^A-Za-z0-9]+/).filter(Boolean).map(part => part[0].toUpperCase() + part.slice(1)).join("") || "Endpoint"}Response${response.statusCode}`;
      const type = noBody && schema === undefined ? `export type ${typeName} = void;\n` : responseTypeScript(schema, typeName);
      return <TabsContent key={response.statusCode} value={String(response.statusCode)} className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><p className="break-words text-sm font-medium">{response.description || "No description yet."}</p>{response.useSharedError && <p className="mt-1 text-xs text-muted-foreground">Uses the project error format</p>}</div>
          <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={Boolean(missingShared) || (schema === undefined && !noBody)} onClick={async () => {
            try { await navigator.clipboard.writeText(type); toast.success("TypeScript copied"); } catch { toast.error("Could not copy TypeScript. Please try again."); }
          }}><Code2Icon className="size-3.5" aria-hidden />Copy as TypeScript</Button>
        </div>
        {missingShared ? <p role="alert" className="text-sm text-destructive">The project error format is unavailable. Ask an editor to configure it.</p>
          : <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <div className="min-w-0 overflow-hidden rounded-md border border-border/70"><div className="flex min-h-11 items-center justify-between gap-2 border-b border-border/70 bg-muted/25 px-3"><h4 className="text-xs font-semibold">Example body</h4>{example && <CopyButton value={example} label={`Copy response ${response.statusCode} example`} />}</div>
              {example ? <pre tabIndex={0} aria-label={`Response ${response.statusCode} example body`} className="max-h-80 overflow-auto p-4 font-mono text-xs leading-6 [scrollbar-width:thin]"><code>{example}</code></pre> : <p className="p-4 text-sm text-muted-foreground">{noBody ? "This response has no body." : "No example documented yet."}</p>}
            </div>
            {schema !== undefined ? <ResponseFieldTree schema={schema} /> : <p className="self-center text-sm text-muted-foreground">{noBody ? "No response fields." : "No response contract documented yet."}</p>}
          </div>}
        {schema !== undefined && !missingShared && <details className="rounded-md border border-border/60 px-3 py-2"><summary className="cursor-pointer text-xs text-muted-foreground">View JSON schema</summary><div className="mt-2 flex justify-end"><CopyButton value={stringifyJson(schema, response.schemaSource)} label={`Copy response ${response.statusCode} schema`} /></div><pre tabIndex={0} className="max-h-64 overflow-auto pb-3 font-mono text-xs leading-5 [scrollbar-width:thin]">{stringifyJson(schema, response.schemaSource)}</pre></details>}
      </TabsContent>;
    })}
  </Tabs>;
}
