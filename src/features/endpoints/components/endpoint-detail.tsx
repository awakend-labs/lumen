"use client";

import {
  BracesIcon,
  Code2Icon,
  FileTextIcon,
  InboxIcon,
  ListTreeIcon,
  PencilIcon,
  SearchIcon,
  SendIcon,
  VariableIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { MarkdownView } from "@/components/markdown-view";
import { MethodBadge, statusClass } from "@/components/method-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canEditContent } from "@/lib/permissions";
import type { EndpointRecord, ParamField, ProjectRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const sectionSurfaceClass =
  "rounded-xl border border-border/40 bg-muted/25 p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]";

const insetSurfaceClass =
  "rounded-lg border border-border/30 bg-background/70 dark:border-white/5 dark:bg-black/20 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]";

export function EndpointDetail({
  projectId,
  endpoint,
  role,
  stashName,
}: {
  projectId: string;
  endpoint: EndpointRecord;
  role: ProjectRole;
  stashName?: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <section className={cn("flex flex-col gap-4", sectionSurfaceClass)}>
        <div className="flex flex-wrap items-start justify-between gap-4 sm:items-center">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <MethodBadge method={endpoint.method} className="h-6 min-w-16" />
              <Badge variant="outline" className="font-mono font-medium">
                {endpoint.version}
              </Badge>
              {stashName ? (
                <Badge variant="secondary" className="font-normal">
                  {stashName}
                </Badge>
              ) : null}
              {endpoint.isDeprecated ? <Badge variant="outline">Deprecated</Badge> : null}
              {endpoint.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{endpoint.name}</h1>
            <div className="flex min-w-0 items-center gap-1">
              <code className={cn("truncate px-2.5 py-1 font-mono text-sm", insetSurfaceClass)}>
                {endpoint.path}
              </code>
              <CopyButton value={endpoint.path} label="Copy path" />
            </div>
          </div>
          {canEditContent(role) ? (
            <Button asChild size="lg" className="shrink-0 shadow-sm">
              <Link href={`/projects/${projectId}/endpoints/${endpoint.id}/edit`}>
                <PencilIcon data-icon="inline-start" />
                Edit endpoint
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      <DetailSection
        icon={FileTextIcon}
        title="Description"
        description="What this endpoint does."
      >
        {endpoint.description.trim() ? (
          <div className={cn("px-4 py-3", insetSurfaceClass)}>
            <MarkdownView content={endpoint.description} />
          </div>
        ) : (
          <EmptyNote>No description yet.</EmptyNote>
        )}
      </DetailSection>

      <ParamSection
        icon={ListTreeIcon}
        title="Headers"
        hint="Sent with the request."
        params={endpoint.headers}
      />
      <ParamSection
        icon={SearchIcon}
        title="Query parameters"
        hint="Passed in the URL."
        params={endpoint.queryParams}
      />
      <ParamSection
        icon={VariableIcon}
        title="Path parameters"
        hint="Filled in from the route."
        params={endpoint.pathParams}
      />

      <DetailSection
        icon={BracesIcon}
        title="Request body"
        description="Schema and a sample payload."
      >
        {endpoint.requestBody ? (
          <div className="grid gap-3 md:grid-cols-2">
            <JsonBlock title="Schema" value={endpoint.requestBody.schema} />
            <JsonBlock title="Example" value={endpoint.requestBody.example} />
          </div>
        ) : (
          <EmptyNote>No request body.</EmptyNote>
        )}
      </DetailSection>

      <DetailSection
        icon={InboxIcon}
        title="Responses"
        description="Status codes this route can return."
      >
        {endpoint.responses.length === 0 ? (
          <EmptyNote>No responses documented.</EmptyNote>
        ) : (
          <div className="flex flex-col gap-3">
            {endpoint.responses.map((response, index) => (
              <div key={`${response.statusCode}-${index}`} className={cn("flex flex-col gap-3 p-4", insetSurfaceClass)}>
                <div className="flex items-center gap-2 text-base font-medium">
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
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <JsonBlock title="Example" value={response.body} />
                  <JsonBlock title="Schema" value={response.schema} />
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      <section
        className={cn(
          "flex flex-col gap-3 border-dashed dark:border-primary/20",
          sectionSurfaceClass,
          "bg-primary/5 dark:bg-primary/4",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15"
              aria-hidden
            >
              <SendIcon className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-sm font-semibold">Try it</h2>
              <p className="text-xs text-muted-foreground">
                Sending a live request is not available yet.
              </p>
            </div>
          </div>
          <Button type="button" disabled>
            <SendIcon data-icon="inline-start" />
            Send request
          </Button>
        </div>
        <div className={cn("flex items-center gap-2 px-3 py-2 font-mono text-sm", insetSurfaceClass)}>
          <MethodBadge method={endpoint.method} />
          <span className="truncate">{endpoint.path}</span>
        </div>
      </section>
    </div>
  );
}

function DetailSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col gap-4", sectionSurfaceClass)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15"
            aria-hidden
          >
            <Icon className="size-4" />
          </div>
        ) : null}
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "border-dashed px-3 py-4 text-sm text-muted-foreground dark:border-white/5 dark:bg-black/15",
        insetSurfaceClass,
      )}
    >
      {children}
    </p>
  );
}

function ParamSection({
  icon,
  title,
  hint,
  params,
}: {
  icon?: LucideIcon;
  title: string;
  hint: string;
  params: ParamField[];
}) {
  return (
    <DetailSection icon={icon} title={title} description={hint}>
      {params.length === 0 ? (
        <EmptyNote>None.</EmptyNote>
      ) : (
        <div className={cn("overflow-hidden", insetSurfaceClass)}>
          {params.map((param) => (
            <div
              key={`${param.key}-${param.description}`}
              className="grid gap-1 border-b border-border/30 px-4 py-3 last:border-b-0 dark:border-white/5 md:grid-cols-[180px_1fr]"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{param.key}</span>
                {param.required ? <Badge variant="outline">Required</Badge> : null}
              </div>
              <div className="text-sm text-muted-foreground">
                {param.value ? (
                  <span className="mr-2 font-mono text-foreground">{param.value}</span>
                ) : null}
                {param.description || "No description"}
              </div>
            </div>
          ))}
        </div>
      )}
    </DetailSection>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  const text = value === undefined ? "" : JSON.stringify(value, null, 2);
  const TitleIcon = title === "Schema" ? BracesIcon : Code2Icon;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <TitleIcon className="size-3.5" aria-hidden />
          {title}
        </p>
        {text ? <CopyButton value={text} label={`Copy ${title}`} /> : null}
      </div>
      {text ? (
        <pre className={cn("overflow-auto p-3 font-mono text-xs leading-5", insetSurfaceClass)}>
          {text}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">Not set.</p>
      )}
    </div>
  );
}
