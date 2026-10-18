"use client";

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
import { Skeleton } from "@/components/ui/skeleton";
import { EndpointForm } from "@/features/endpoints/components/endpoint-form";
import { useEndpoint } from "@/features/endpoints/queries";
import { ProjectFrame } from "@/features/projects/components/project-frame";

export default function EditEndpointPage({
  params,
}: {
  params: Promise<{ projectId: string; endpointId: string }>;
}) {
  const { projectId, endpointId } = use(params);
  const endpoint = useEndpoint(projectId, endpointId);

  return (
    <ProjectFrame projectId={projectId}>
      {(project) => (
        <div className="mx-auto flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/projects/${project.id}`}>{project.name}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Edit endpoint</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Edit endpoint</h1>
            <p className="text-sm text-muted-foreground">
              Update the route, parameters, and responses. Saving keeps this endpoint in the same project.
            </p>
          </div>
          {endpoint.isLoading ? <Skeleton className="h-96 w-full" /> : null}
          {endpoint.data ? (
            <EndpointForm
              projectId={project.id}
              stashes={project.stashes}
              endpoint={endpoint.data.endpoint}
            />
          ) : null}
        </div>
      )}
    </ProjectFrame>
  );
}
