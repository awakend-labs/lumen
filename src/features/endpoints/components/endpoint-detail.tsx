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
import { FieldTable, schemaFields } from "./field-table";
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
              <div className="flex min-w-0 items-center gap-1">
                <code className={cn("truncate px-2.5 py-1 font-mono text-sm", insetSurfaceClass)}>
                  {endpoint.path}
                </code>
                <CopyButton value={endpoint.path} label="Copy path" />
              </div>
            </div>
            {canEditContent(role) ? (
              <div className="flex flex-wrap items-center gap-2 xl:justify-end xl:pt-9">
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
              <FieldTable fields={endpoint.requestBody.fields?.length ? endpoint.requestBody.fields : schemaFields(endpoint.requestBody.schema)} />
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
                <div key={`${response.statusCode}-${index}`} className={cn("lumen-response flex flex-col gap-3 p-4", insetSurfaceClass)}>
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
                    <div className="min-w-0 space-y-3">
                      <FieldTable fields={schemaFields(response.schema)} />
                      <JsonBlock title="Schema" value={response.schema} />
                    </div>
                  </div>
                </div>
              ))}
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
