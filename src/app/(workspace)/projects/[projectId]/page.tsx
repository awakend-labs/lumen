"use client";

import { Layers, PlusIcon, Route, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { EndpointBrowser } from "@/features/endpoints/components/endpoint-browser";
import { ProjectFrame } from "@/features/projects/components/project-frame";
import { ProjectStatusControl } from "@/features/projects/components/project-status-control";
import { StashDialog } from "@/features/stashes/components/stash-dialog";
import { useCreateStash } from "@/features/stashes/queries";
import { canEditContent } from "@/lib/permissions";
import { accentFor } from "@/lib/project-accent";
import { cn } from "@/lib/utils";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  return <ProjectView projectId={projectId} />;
}

function ProjectView({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const create = useCreateStash(projectId);

  return (
    <ProjectFrame projectId={projectId}>
      {(project) => {
        const accent = accentFor(project.id);
        const endpointCount = project.stashes.reduce(
          (sum, stash) => sum + stash.endpoints.length,
          0,
        );
        return (
        <div className="lumen-page flex flex-col gap-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard">Projects</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{project.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex flex-col items-start justify-between gap-5 xl:flex-row xl:items-end">
            <div className="flex w-full min-w-0 max-w-2xl flex-1 flex-col gap-2 xl:w-auto">
              <div className="flex min-w-0 items-center gap-2"><h1 className="min-w-0 break-words text-3xl font-semibold tracking-[-0.04em]">{project.name}</h1></div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {project.description || "No description yet."}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1 text-xs text-muted-foreground">
                  <Layers className={cn("size-3.5", accent.icon)} />
                  <span className="font-medium text-foreground">{project.stashes.length}</span>
                  {project.stashes.length === 1 ? "stash" : "stashes"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1 text-xs text-muted-foreground">
                  <Route className={cn("size-3.5", accent.icon)} />
                  <span className="font-medium text-foreground">{endpointCount}</span>
                  endpoints
                </span>
                <ProjectStatusControl
                  projectId={project.id}
                  status={project.status}
                  role={project.role}
                />
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {canEditContent(project.role) && <Button asChild variant="outline" className="h-9">
                <Link href={`/projects/${project.id}/settings`}>
                  <SettingsIcon data-icon="inline-start" />
                  Settings
                </Link>
              </Button>}
              {canEditContent(project.role) ? (
                <Button className="h-9" onClick={() => setOpen(true)}>
                  <PlusIcon data-icon="inline-start" />
                  New stash
                </Button>
              ) : null}
            </div>
          </div>
          <EndpointBrowser project={project} onCreateStash={() => setOpen(true)} />
          <StashDialog
            open={open}
            onOpenChange={setOpen}
            pending={create.isPending}
            onSubmit={(values) =>
              create.mutate(values, { onSuccess: () => setOpen(false) })
            }
          />
        </div>
        );
      }}
    </ProjectFrame>
  );
}
