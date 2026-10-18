"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { use } from "react";
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
import { canEditContent } from "@/lib/permissions";

export default function StashPage({
  params,
}: {
  params: Promise<{ projectId: string; stashId: string }>;
}) {
  const { projectId, stashId } = use(params);

  return (
    <ProjectFrame projectId={projectId}>
      {(project) => {
        const stash = project.stashes.find((item) => item.id === stashId);
        return (
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
                  <BreadcrumbLink asChild>
                    <Link href={`/projects/${project.id}`}>{project.name}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{stash?.name ?? "Stash"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {stash?.name ?? "Stash"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {stash?.description || "Endpoints in this stash."}
                </p>
              </div>
              {stash && canEditContent(project.role) ? (
                <Button asChild>
                  <Link href={`/projects/${project.id}/endpoints/new?stash=${stash.id}`}>
                    <PlusIcon data-icon="inline-start" />
                    New endpoint
                  </Link>
                </Button>
              ) : null}
            </div>
            <EndpointBrowser project={project} stashId={stashId} />
          </div>
        );
      }}
    </ProjectFrame>
  );
}
