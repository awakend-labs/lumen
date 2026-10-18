"use client";

import { PlusIcon, SettingsIcon } from "lucide-react";
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
import { StashDialog } from "@/features/stashes/components/stash-dialog";
import { useCreateStash } from "@/features/stashes/queries";
import { canEditContent } from "@/lib/permissions";

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
      {(project) => (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
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
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex max-w-2xl flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                {project.description || "No description yet."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={`/projects/${project.id}/settings`}>
                  <SettingsIcon data-icon="inline-start" />
                  Settings
                </Link>
              </Button>
              {canEditContent(project.role) ? (
                <Button onClick={() => setOpen(true)}>
                  <PlusIcon data-icon="inline-start" />
                  New stash
                </Button>
              ) : null}
            </div>
          </div>
          <EndpointBrowser project={project} />
          <StashDialog
            open={open}
            onOpenChange={setOpen}
            pending={create.isPending}
            onSubmit={(values) =>
              create.mutate(values, { onSuccess: () => setOpen(false) })
            }
          />
        </div>
      )}
    </ProjectFrame>
  );
}
