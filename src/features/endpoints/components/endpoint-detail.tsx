"use client";

import { PencilIcon } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { MarkdownView } from "@/components/markdown-view";
import { MethodBadge, statusClass } from "@/components/method-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { canEditContent } from "@/lib/permissions";
import type { EndpointRecord, ParamField, ProjectRole } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EndpointDetail({
  projectId,
  endpoint,
  role,
}: {
  projectId: string;
  endpoint: EndpointRecord;
  role: ProjectRole;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <MethodBadge method={endpoint.method} />
            {endpoint.isDeprecated ? <Badge variant="outline">Deprecated</Badge> : null}
            {endpoint.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{endpoint.name}</h1>
          <div className="flex items-center gap-1">
            <code className="truncate rounded-md bg-muted px-2 py-1 font-mono text-sm">
              {endpoint.path}
            </code>
            <CopyButton value={endpoint.path} label="Copy path" />
          </div>
        </div>
        {canEditContent(role) ? (
          <Button asChild variant="outline">
            <Link href={`/projects/${projectId}/endpoints/${endpoint.id}/edit`}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </Link>
          </Button>
        ) : null}
      </div>

      <MarkdownView content={endpoint.description} />

      <ParamSection title="Headers" params={endpoint.headers} />
      <ParamSection title="Query parameters" params={endpoint.queryParams} />
      <ParamSection title="Path parameters" params={endpoint.pathParams} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Request body</h2>
        {endpoint.requestBody ? (
          <div className="grid gap-3 md:grid-cols-2">
            <JsonBlock title="Schema" value={endpoint.requestBody.schema} />
            <JsonBlock title="Example" value={endpoint.requestBody.example} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No request body.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Responses</h2>
        {endpoint.responses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No responses documented.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {endpoint.responses.map((response, index) => (
              <Card key={`${response.statusCode}-${index}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span
                      className={cn(
                        "inline-flex h-5 items-center rounded-md px-1.5 font-mono text-xs font-semibold",
                        statusClass(response.statusCode),
                      )}
                    >
                      {response.statusCode}
                    </span>
                    <span className="font-normal text-muted-foreground">
                      {response.description || "No description"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <JsonBlock title="Example" value={response.body} />
                  <JsonBlock title="Schema" value={response.schema} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Separator />

      <section className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Try it</h2>
            <p className="text-sm text-muted-foreground">
              Request execution is a placeholder for now.
            </p>
          </div>
          <Button type="button" disabled>
            Send request
          </Button>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 font-mono text-sm">
          <MethodBadge method={endpoint.method} />
          <span className="truncate">{endpoint.path}</span>
        </div>
      </section>
    </div>
  );
}

function ParamSection({ title, params }: { title: string; params: ParamField[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">{title}</h2>
      {params.length === 0 ? (
        <p className="text-sm text-muted-foreground">None.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          {params.map((param) => (
            <div
              key={`${param.key}-${param.description}`}
              className="grid gap-1 border-b px-4 py-3 last:border-b-0 md:grid-cols-[180px_1fr]"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{param.key}</span>
                {param.required ? <Badge variant="outline">Required</Badge> : null}
              </div>
              <div className="text-sm text-muted-foreground">
                {param.value ? <span className="mr-2 font-mono text-foreground">{param.value}</span> : null}
                {param.description || "No description"}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  const text = value === undefined ? "" : JSON.stringify(value, null, 2);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        {text ? <CopyButton value={text} label={`Copy ${title}`} /> : null}
      </div>
      {text ? (
        <pre className="overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-5">{text}</pre>
      ) : (
        <p className="text-sm text-muted-foreground">Not set.</p>
      )}
    </div>
  );
}
