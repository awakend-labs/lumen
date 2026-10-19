"use client";

import {
  BracesIcon,
  Code2Icon,
  FileTextIcon,
  InboxIcon,
  ListTreeIcon,
  PencilIcon,
  SearchIcon,
  VariableIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Shield, Copy } from "lucide-react";
import { CurlExample } from "./curl-example";
import { FieldTable, requestBodyFields, schemaFields } from "./field-table";
import { authLabels } from "@/features/projects/components/project-auth-settings";
import { useProject } from "@/features/projects/queries";
import { SectionNav, sectionId } from "@/components/section-nav";
import { CopyButton } from "@/components/copy-button";
import { MarkdownView } from "@/components/markdown-view";
import { MethodBadge, statusClass } from "@/components/method-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canEditContent } from "@/lib/permissions";
import type { EndpointRecord, ParamField, ProjectRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DeleteEndpointButton } from "./delete-endpoint-button";

const sectionSurfaceClass =
  "border-b border-border py-7 first:pt-0 last:border-b-0";

const insetSurfaceClass =
  "lumen-inset";

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
  const project = useProject(projectId);
  const auth = project.data?.auth;
  return (
    <div className="grid min-w-0 gap-7 lg:grid-cols-[155px_minmax(0,1fr)] lg:gap-10">
      <SectionNav sections={["Overview", "Authentication", "Description", "Headers", "Query parameters", "Path parameters", "Request body", "Responses", "cURL"]} />
      <div className="flex min-w-0 flex-col gap-6">
        <section id="overview" className={cn("scroll-mt-24 flex flex-col gap-4", sectionSurfaceClass)}>
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
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
              <div className="flex min-w-0 items-center gap-2"><h1 className="min-w-0 break-words text-3xl font-semibold tracking-[-0.04em]">{endpoint.name}</h1></div>
              <div
                className="mt-2 flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1"
                style={{ backgroundImage: "var(--surface-gradient)" }}
              >
                <Code2Icon aria-hidden className="hidden size-4 shrink-0 text-muted-foreground/70 sm:block" />
                <div className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className="shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Path
                  </span>
                  <code className="min-w-0 overflow-x-auto font-mono text-sm font-medium leading-snug whitespace-nowrap [scrollbar-width:thin]">
                    {endpoint.path}
                  </code>
                </div>
                <div className="flex shrink-0 items-center border-l border-border pl-1">
                  <CopyButton value={endpoint.path} label="Copy path" />
                </div>
              </div>
            </div>
            {canEditContent(role) ? (
              <div className="flex flex-wrap items-center gap-2 xl:justify-end xl:pt-9">
                <DeleteEndpointButton projectId={projectId} endpoint={endpoint} />
                <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs">
                  <Link href={`/projects/${projectId}/endpoints/new?duplicate=${endpoint.id}`}>
                    <Copy data-icon="inline-start" />
                    Duplicate endpoint
                  </Link>
                </Button>
                <Button asChild size="sm" className="h-8 px-3 text-xs shadow-sm">
                  <Link href={`/projects/${projectId}/endpoints/${endpoint.id}/edit`}>
                    <PencilIcon data-icon="inline-start" />
                    Edit endpoint
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        <DetailSection icon={Shield} title="Authentication">
          <p className="text-sm font-medium">{endpoint.access === "public" ? "Public · no authentication required" : endpoint.access === "admin_only" ? "Admin-only · administrator privileges required" : "Authenticated"}</p>
          {endpoint.access !== "public" && <div className="space-y-2 text-sm text-muted-foreground">
            <p>{auth ? authLabels[auth.scheme] : "Loading project authentication…"}</p>
            {auth?.scheme === "bearer" && <code>Authorization: Bearer &lt;token&gt;</code>}
            {auth?.scheme === "basic" && <code>Authorization: Basic &lt;base64(username:password)&gt;</code>}
            {auth?.scheme === "api_key" && <p>{auth.location === "header" ? "Header" : "Query parameter"}: <code>{auth.headerName}: &lt;api-key&gt;</code>
            </p>}
            {auth?.description && <MarkdownView content={auth.description} />}
            {auth?.scheme === "none" && <p>Configure the authentication scheme in project settings.</p>}
          </div>}
        </DetailSection>
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
            <div className="grid min-w-0 gap-3">
              {endpoint.requestBody.contentType && <p className="font-mono text-xs text-muted-foreground">{endpoint.requestBody.contentType}</p>}
              {endpoint.requestBody.raw !== undefined && <pre className="lumen-inset overflow-auto p-4 font-mono text-xs">{endpoint.requestBody.raw}</pre>}
              <FieldTable fields={requestBodyFields(endpoint.requestBody.fields, endpoint.requestBody.schema)} />
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
              {endpoint.responses.map((response, index) => {
                const fields = schemaFields(response.schema);
                return (
                  <div
                    key={`${response.statusCode}-${index}`}
                    className={cn("lumen-response flex flex-col gap-4 p-4", insetSurfaceClass)}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span
                        className={cn(
                          "inline-flex h-5 shrink-0 items-center rounded-sm px-1.5 font-mono text-xs font-semibold",
                          statusClass(response.statusCode),
                        )}
                      >
                        {response.statusCode}
                      </span>
                      <span className="min-w-0 text-sm leading-snug text-muted-foreground">
                        {response.description || "No description"}
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                      <JsonBlock title="Example" value={response.body} />
                      <JsonBlock title="Schema" value={response.schema} />
                    </div>
                    {fields.length > 0 ? (
                      <div className="flex min-w-0 flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground">Fields</p>
                        <FieldTable fields={fields} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </DetailSection>

        <CurlExample endpoint={endpoint} auth={auth} />
      </div>
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
    <section id={sectionId(title)} className={cn("scroll-mt-24 flex flex-col gap-4", sectionSurfaceClass)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <div
            className="flex size-6 shrink-0 items-center justify-center text-muted-foreground"
            aria-hidden
          >
            <Icon className="size-4" />
          </div>
        ) : null}
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode; }) {
  return (
    <p
      className="text-sm text-muted-foreground"
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
        <FieldTable fields={params} />
      )}
    </DetailSection>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown; }) {
  const text =
    value === undefined || value === null || value === ""
      ? ""
      : JSON.stringify(value, null, 2);
  const TitleIcon = title === "Schema" ? BracesIcon : Code2Icon;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <TitleIcon className="size-3.5 shrink-0" aria-hidden />
          {title}
        </p>
        {text ? <CopyButton value={text} label={`Copy ${title}`} /> : null}
      </div>
      {text ? (
        <pre className={cn("overflow-auto p-3 font-mono text-xs leading-5", insetSurfaceClass)}>
          {text}
        </pre>
      ) : (
        <p
          className={cn(
            "px-3 py-2.5 text-sm leading-snug text-muted-foreground",
            insetSurfaceClass,
          )}
        >
          Not set.
        </p>
      )}
    </div>
  );
}
