"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, use } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { EndpointForm } from "@/features/endpoints/components/endpoint-form";
import { ProjectFrame } from "@/features/projects/components/project-frame";

export default function NewEndpointPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  return (
    <Suspense>
      <NewEndpoint projectId={projectId} />
    </Suspense>
  );
}

function NewEndpoint({ projectId }: { projectId: string }) {
  const search = useSearchParams();
  const stashId = search.get("stash") ?? undefined;

  return (
    <ProjectFrame projectId={projectId}>
      {(project) => (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/projects/${project.id}`}>{project.name}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>New endpoint</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-semibold tracking-tight">New endpoint</h1>
          <EndpointForm
            projectId={project.id}
            stashes={project.stashes}
            initialStashId={stashId}
          />
        </div>
      )}
    </ProjectFrame>
  );
}
