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

  return (
    <ProjectFrame projectId={projectId}>
      {(project) => (
        <div className="lumen-page flex flex-col gap-8">
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
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">New endpoint</h1>
            <p className="text-sm text-muted-foreground">
              Document the route, parameters, and the responses callers should expect.
            </p>
          </div>
          <EndpointForm
            projectId={project.id}
            stashes={project.stashes}
            initialStashId={stashId}
            importCurl={search.get("import") === "curl"}
            duplicateFrom={project.stashes.flatMap(stash => stash.endpoints).find(endpoint => endpoint.id === search.get("duplicate"))}
          />
        </div>
      )}
    </ProjectFrame>
  );
}
