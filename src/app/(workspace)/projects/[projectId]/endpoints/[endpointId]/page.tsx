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
import { ProjectFrame } from "@/features/projects/components/project-frame";

export default function EndpointPage({
  params,
}: {
  params: Promise<{ projectId: string; endpointId: string; }>;
}) {
  const { projectId, endpointId } = use(params);
  const project = useProject(projectId);
  const endpoint = useEndpoint(projectId, endpointId);

  return (
    <ProjectFrame projectId={projectId}>{() => (
    <div className="lumen-page flex flex-col gap-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/projects/${projectId}`}>
                {project.data?.name ?? "Project"}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {endpoint.data && <><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbLink asChild><Link href={`/projects/${projectId}/stashes/${endpoint.data.endpoint.stashId}`}>{project.data?.stashes.find(stash => stash.id === endpoint.data.endpoint.stashId)?.name ?? "Stash"}</Link></BreadcrumbLink></BreadcrumbItem></>}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{endpoint.data?.endpoint.name ?? "Endpoint"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {endpoint.isLoading ? <Skeleton className="h-80 w-full rounded-md" /> : null}
      {endpoint.isError ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Endpoint unavailable</EmptyTitle>
            <EmptyDescription>{endpoint.error.message}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {endpoint.data && !endpoint.isError ? (
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
    )}</ProjectFrame>
  );
}
