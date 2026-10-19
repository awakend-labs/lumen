"use client";

import { TerminalSquare } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { generateCurl } from "@/lib/curl";
import type { EndpointRecord, ProjectAuth } from "@/lib/types";

export function CurlExample({ endpoint, auth }: { endpoint: EndpointRecord; auth?: ProjectAuth }) {
  const command = generateCurl(endpoint, auth);
  return (
    <section id="curl" className="scroll-mt-24 border-b border-border py-7">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-base font-semibold tracking-tight"><TerminalSquare className="size-4 text-muted-foreground" />cURL</h2>
          <p className="mt-1 text-xs text-muted-foreground">Copy this request to test your endpoint in a terminal.</p></div>
        <CopyButton value={command} label="Copy cURL command" />
      </div>
      <pre className="lumen-inset max-w-full overflow-x-auto p-4 font-mono text-xs leading-6"><code>{command}</code></pre>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{!endpoint.baseUrl && "Replace https://api.example.com with your server URL, or set it when editing this endpoint. "}Replace YOUR_ placeholders with your test values. Command format: Bash / zsh.</p>
    </section>
  );
}
