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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { EndpointDetail } from "@/features/endpoints/components/endpoint-detail";
import { useEndpoint } from "@/features/endpoints/queries";
import { useProject } from "@/features/projects/queries";

export default function EndpointPage({
  params,
}: {
  params: Promise<{ projectId: string; endpointId: string }>;
}) {
  const { projectId, endpointId } = use(params);
  const project = useProject(projectId);
  const endpoint = useEndpoint(projectId, endpointId);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/projects/${projectId}`}>
                {project.data?.name ?? "Project"}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{endpoint.data?.endpoint.name ?? "Endpoint"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {endpoint.isLoading ? <Skeleton className="h-80 w-full rounded-xl" /> : null}
      {endpoint.isError ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Endpoint unavailable</EmptyTitle>
            <EmptyDescription>{endpoint.error.message}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {endpoint.data ? (
        <EndpointDetail
          projectId={projectId}
          endpoint={endpoint.data.endpoint}
          role={endpoint.data.role}
          stashName={
            project.data?.stashes.find((stash) => stash.id === endpoint.data.endpoint.stashId)
              ?.name
          }
        />
      ) : null}
    </div>
  );
}
