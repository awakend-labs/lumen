"use client";

import {
  BracesIcon,
  Code2Icon,
  FileTextIcon,
  InboxIcon,
  ListTreeIcon,
  PencilIcon,
  SearchIcon,
  TagIcon,
  VariableIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Shield, Copy } from "lucide-react";
import { CurlExample } from "./curl-example";
import { FieldTable, requestBodyFields } from "./field-table";
import { ResponsesView } from "./responses-view";
import { authLabels } from "@/features/projects/components/project-auth-settings";
import { useProject } from "@/features/projects/queries";
import { SectionNav, sectionId } from "@/components/section-nav";
import { EndpointPathBar } from "./endpoint-path-bar";
import { CopyButton } from "@/components/copy-button";
import { MarkdownView } from "@/components/markdown-view";
import { EndpointVersionBadge, MethodBadge } from "@/components/method-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canEditContent } from "@/lib/permissions";
import type { EndpointRecord, ParamField, ProjectRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { HighlightedJson } from "@/lib/highlighted-json";
import { stringifyJson } from "@/lib/json-source";
import { DeleteEndpointButton } from "./delete-endpoint-button";

const sectionSurfaceClass =
  "border-b border-border/80 py-8 first:pt-0 last:border-b-0";

export function EndpointDetail({
  projectId,
  endpoint,
  role,
}: {
  projectId: string;
  endpoint: EndpointRecord;
  role: ProjectRole;
}) {
  const project = useProject(projectId);
  const auth = project.data?.auth;
  return (
    <div className="grid min-w-0 gap-7 lg:grid-cols-[155px_minmax(0,1fr)] lg:gap-10">
      <SectionNav
        sections={[
          "Overview",
          "Authentication",
          "Description",
          "Headers",
          "Query parameters",
          "Path parameters",
          "Request body",
          "Responses",
          "cURL",
        ]}
      />
      <div className="flex min-w-0 flex-col gap-2">
        <section
          id="overview"
          className={cn(
            "scroll-mt-24 flex flex-col gap-4",
            sectionSurfaceClass,
          )}
        >
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                <MethodBadge
                  method={endpoint.method}
                  className="h-6 min-w-16"
                />
                <EndpointVersionBadge version={endpoint.version} />
                {endpoint.isDeprecated ? (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  >
                    Deprecated
                  </Badge>
                ) : null}
                {endpoint.tags.length > 0 ? (
                  <div
                    className="flex min-w-0 flex-wrap items-center gap-1.5 border-l border-border pl-2 sm:pl-2.5"
                    aria-label="Tags"
                  >
                    <TagIcon
                      className="size-3.5 shrink-0 text-[color-mix(in_srgb,var(--primary)_22%,var(--muted-foreground))]"
                      aria-hidden
                    />
                    {endpoint.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="border-primary/12 bg-[color-mix(in_srgb,var(--primary)_5%,var(--card))] font-normal text-[color-mix(in_srgb,var(--primary)_34%,var(--muted-foreground))] dark:border-primary/14 dark:bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))] dark:text-[color-mix(in_srgb,var(--primary)_44%,var(--muted-foreground))]"
                      >
                        <span
                          className="font-mono text-[11px] text-inherit"
                          aria-hidden
                        >
                          #
                        </span>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="mt-2 flex min-w-0 items-center gap-2">
                <h1
                  className={cn(
                    "min-w-0 break-words text-3xl font-semibold tracking-[-0.04em]",
                    endpoint.isDeprecated &&
                      "line-through decoration-muted-foreground",
                  )}
                >
                  {endpoint.name}
                </h1>
              </div>
              <EndpointPathBar method={endpoint.method} endpoint={endpoint} />
              {endpoint.isDeprecated && (
                <p
                  role="note"
                  className="text-sm text-amber-700 dark:text-amber-400"
                >
                  This endpoint is deprecated. Avoid using it in new
                  integrations.
                </p>
              )}
            </div>
            {canEditContent(role) ? (
              <div className="flex flex-wrap items-center gap-2 xl:justify-end xl:pt-11">
                <DeleteEndpointButton
                  projectId={projectId}
                  endpoint={endpoint}
                />
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  <Link
                    href={`/projects/${projectId}/endpoints/new?duplicate=${endpoint.id}`}
                  >
                    <Copy data-icon="inline-start" />
                    Duplicate endpoint
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="h-8 px-3 text-xs shadow-sm"
                >
                  <Link
                    href={`/projects/${projectId}/endpoints/${endpoint.id}/edit`}
                  >
                    <PencilIcon data-icon="inline-start" />
                    Edit endpoint
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        <DetailSection
          icon={Shield}
          title="Authentication"
          description="Who may call this endpoint and how credentials are sent."
        >
          <p className="text-sm font-medium">
            {endpoint.access === "public"
              ? "Public · no authentication required"
              : endpoint.access === "admin_only"
                ? "Admin-only · administrator privileges required"
                : "Authenticated"}
          </p>
          {endpoint.access !== "public" && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                {auth
                  ? authLabels[auth.scheme]
                  : "Loading project authentication…"}
              </p>
              {auth?.scheme === "bearer" && (
                <AuthCode>Authorization: Bearer &lt;token&gt;</AuthCode>
              )}
              {auth?.scheme === "basic" && (
                <AuthCode>
                  Authorization: Basic &lt;base64(username:password)&gt;
                </AuthCode>
              )}
              {auth?.scheme === "api_key" && (
                <p>
                  {auth.location === "header" ? "Header" : "Query parameter"}:{" "}
                  <code>{auth.headerName}: &lt;api-key&gt;</code>
                </p>
              )}
              {auth?.description && <MarkdownView content={auth.description} />}
              {auth?.scheme === "none" && (
                <p>Configure the authentication scheme in project settings.</p>
              )}
            </div>
          )}
        </DetailSection>
        <DetailSection
          icon={FileTextIcon}
          title="Description"
          description="What this endpoint does."
        >
          {endpoint.description.trim() ? (
            <div className="rounded-sm border border-border/70 bg-[color-mix(in_srgb,var(--stash-green)_6%,color-mix(in_srgb,var(--foreground)_5%,var(--card)))] px-4 py-3.5 shadow-[inset_3px_0_0_0_color-mix(in_srgb,var(--stash-green)_40%,transparent)] dark:border-stash-green/15 dark:bg-[color-mix(in_srgb,var(--stash-green)_8%,color-mix(in_srgb,var(--background)_55%,var(--card)))] [&_.markdown]:leading-7 [&_.markdown]:text-foreground/90">
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
              {endpoint.requestBody.contentType && (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-6 w-fit px-2.5 font-mono text-[11px] font-medium tracking-tight",
                    /json/i.test(endpoint.requestBody.contentType)
                      ? "border-primary/18 bg-[color-mix(in_srgb,var(--primary)_6%,var(--card))] text-[color-mix(in_srgb,var(--primary)_36%,var(--muted-foreground))] dark:border-primary/16 dark:bg-[color-mix(in_srgb,var(--primary)_9%,var(--card))] dark:text-[color-mix(in_srgb,var(--primary)_44%,var(--muted-foreground))]"
                      : "border-border/80 bg-muted/30 text-muted-foreground",
                  )}
                >
                  {endpoint.requestBody.contentType}
                </Badge>
              )}
              {endpoint.requestBody.raw !== undefined && (
                <pre className="lumen-inset overflow-auto p-4 font-mono text-xs">
                  <HighlightedJson text={endpoint.requestBody.raw} />
                </pre>
              )}
              <FieldTable
                fields={requestBodyFields(
                  endpoint.requestBody.fields,
                  endpoint.requestBody.schema,
                )}
              />
              <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                <JsonBlock
                  title="Schema"
                  value={endpoint.requestBody.schema}
                  source={endpoint.requestBody.schemaSource}
                />
                <JsonBlock
                  title="Example"
                  value={endpoint.requestBody.example}
                  source={endpoint.requestBody.exampleSource}
                />
              </div>
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
          <ResponsesView
            responses={endpoint.responses}
            method={endpoint.method}
            endpointName={endpoint.name}
            shared={project.data?.responseErrorFormat}
          />
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
    <section
      id={sectionId(title)}
      className={cn("scroll-mt-24 flex flex-col gap-4", sectionSurfaceClass)}
    >
      <div
        className={cn(
          "flex min-w-0 gap-3",
          description ? "items-start" : "items-center",
        )}
      >
        {Icon ? (
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
            aria-hidden
          >
            <Icon className="size-4" />
          </div>
        ) : null}
        <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
          <h2 className="text-base font-semibold leading-tight tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="text-xs leading-snug text-muted-foreground">
              {description}
            </p>
          ) : null}
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
        "rounded-sm border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground dark:border-white/10 dark:bg-black/10",
      )}
    >
      {children}
    </p>
  );
}

function AuthCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="block w-fit max-w-full overflow-x-auto rounded-sm border border-border bg-muted/40 px-3 py-2 font-mono text-xs dark:bg-muted/50">
      {children}
    </code>
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
        <FieldTable
          fields={params}
          label={title}
          headers={title === "Headers"}
          fieldLabel="Parameter"
        />
      )}
    </DetailSection>
  );
}

export function JsonBlock({
  title,
  value,
  source,
}: {
  title: string;
  value: unknown;
  source?: string;
}) {
  const text =
    !source && (value === undefined || value === null || value === "")
      ? ""
      : stringifyJson(value, source);
  const isSchema = title === "Schema";
  const TitleIcon = isSchema ? BracesIcon : Code2Icon;
  const scrollClass =
    "overflow-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:size-1.5 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-sm border border-border",
        "bg-background/50 dark:bg-background/30",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b border-border/80 px-2.5 py-2",
          "bg-muted/30 dark:bg-muted/20",
        )}
      >
        <p className="flex min-w-0 items-center gap-2 text-xs font-semibold tracking-[-0.01em] text-foreground">
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-sm border border-border/70",
              isSchema
                ? "bg-muted/50 text-muted-foreground dark:bg-muted/40"
                : "bg-primary/10 text-primary dark:bg-primary/15",
            )}
            aria-hidden
          >
            <TitleIcon className="size-3.5" />
          </span>
          <span className="truncate">{title}</span>
          <span className="rounded-sm bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground dark:bg-muted/50">
            JSON
          </span>
        </p>
        {text ? <CopyButton value={text} label={`Copy ${title}`} /> : null}
      </div>
      {text ? (
        <pre
          tabIndex={0}
          aria-label={`${title} JSON`}
          className={cn("h-64 p-3 font-mono text-xs leading-5", scrollClass)}
        >
          <HighlightedJson text={text} />
        </pre>
      ) : (
        <p
          className={cn(
            "flex h-64 items-center justify-center px-3 text-sm text-muted-foreground",
            scrollClass,
          )}
        >
          Not set.
        </p>
      )}
    </div>
  );
}
