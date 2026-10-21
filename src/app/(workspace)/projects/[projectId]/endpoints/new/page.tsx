"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, FolderOpen, Layers, MoveRight, Route } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, use } from "react";
import { WorkspaceBreadcrumb, endpointTrail } from "@/components/workspace-breadcrumb";
import { EndpointForm } from "@/features/endpoints/components/endpoint-form";
import { useEndpoint } from "@/features/endpoints/queries";
import { ProjectFrame } from "@/features/projects/components/project-frame";
import { stashDotClass } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function NewEndpointPage({
  params,
}: {
  params: Promise<{ projectId: string; }>;
}) {
  const { projectId } = use(params);
  return (
    <Suspense>
      <NewEndpoint projectId={projectId} />
    </Suspense>
  );
}

function NewEndpoint({ projectId }: { projectId: string; }) {
  const search = useSearchParams();
  const stashId = search.get("stash") ?? undefined;
  const duplicateId = search.get("duplicate") ?? "";
  const source = useEndpoint(projectId, duplicateId);

  if (duplicateId && source.isPending) return <p className="lumen-page text-sm text-muted-foreground">Loading endpoint to duplicate…</p>;
  if (duplicateId && (source.isError || !source.data)) return <div className="lumen-page"><p role="alert">{source.error?.message ?? "The endpoint to duplicate is unavailable."}</p><Button asChild variant="outline"><Link href={`/projects/${projectId}`}>Back to project</Link></Button></div>;

  return (
    <ProjectFrame projectId={projectId} editable>
      {(project) => {
        const duplicate = duplicateId ? source.data?.endpoint : undefined;
        const selectedStash = project.stashes.find(stash => stash.id === (duplicate?.stashId ?? stashId));
        return (
        <div className="lumen-page flex flex-col gap-8">
          <WorkspaceBreadcrumb
            items={endpointTrail({
              projectId: project.id,
              projectName: project.name,
              stash: selectedStash,
              groupId: duplicate?.groupId,
              current: { label: "New endpoint" },
            })}
          />
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">New endpoint</h1>
            <p className="text-sm text-muted-foreground">
              Document the route, parameters, and the responses callers should expect.
            </p>
          </div>
          {!selectedStash ? (
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-3 rounded-sm border border-border bg-muted/30 p-3.5 dark:bg-muted/20">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-background/80 text-primary dark:bg-background/40"
                  aria-hidden
                >
                  <FolderOpen className="size-4" />
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-semibold tracking-[-0.01em] text-foreground">
                    {stashId ? "Stash unavailable" : "Choose a stash"}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {stashId ? "That stash is unavailable. " : ""}
                    {project.stashes.length
                      ? "Pick where this endpoint should live, then start documenting the route."
                      : "Create a stash in this project before adding an endpoint."}
                  </p>
                </div>
              </div>
              {project.stashes.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {project.stashes.map((stash) => {
                    const next = new URLSearchParams(search.toString());
                    next.set("stash", stash.id);
                    next.delete("duplicate");
                    const endpointCount = stash.endpoints.length;
                    const groupCount = stash.groups.length;
                    return (
                      <Link
                        key={stash.id}
                        href={`/projects/${project.id}/endpoints/new?${next}`}
                        className="group flex min-w-0 items-center gap-3 rounded-sm border border-border bg-card p-4 transition-[border-color,background-color] hover:border-border/80 hover:bg-foreground/[0.035] dark:hover:bg-white/[0.05]"
                      >
                        <span
                          className={cn(
                            "size-2.5 shrink-0 rounded-sm",
                            stashDotClass(stash.color),
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold tracking-[-0.01em]">
                            {stash.name}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-2.5 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Route className="size-3" aria-hidden />
                              {endpointCount}{" "}
                              {endpointCount === 1 ? "endpoint" : "endpoints"}
                            </span>
                            {groupCount > 0 ? (
                              <span className="inline-flex items-center gap-1">
                                <Layers className="size-3" aria-hidden />
                                {groupCount} {groupCount === 1 ? "group" : "groups"}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <MoveRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                      </Link>
                    );
                  })}
                </div>
              ) : null}
              <Button asChild variant="outline" size="sm" className="w-fit">
                <Link href={`/projects/${project.id}`}>
                  <ArrowLeftIcon data-icon="inline-start" />
                  Back to project
                </Link>
              </Button>
            </div>
          ) : <EndpointForm
            projectId={project.id}
            stashes={project.stashes}
            key={`${selectedStash.id}:${duplicate?.id ?? "new"}`}
            initialStashId={selectedStash.id}
            projectBaseUrl={project.baseUrl}
            projectAuth={project.auth}
            importCurl={search.get("import") === "curl"}
            duplicateFrom={duplicate}
          />}
        </div>
      ); }}
    </ProjectFrame>
  );
}
