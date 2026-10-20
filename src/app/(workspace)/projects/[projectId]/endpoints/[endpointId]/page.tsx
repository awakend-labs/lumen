"use client";

import { use } from "react";
import { WorkspaceBreadcrumb, endpointTrail } from "@/components/workspace-breadcrumb";
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
  const record = endpoint.data?.endpoint;
  const stash = record
    ? project.data?.stashes.find((item) => item.id === record.stashId)
    : undefined;

  return (
    <ProjectFrame projectId={projectId}>{() => (
    <div className="lumen-page flex flex-col gap-8">
      <WorkspaceBreadcrumb
        items={endpointTrail({
          projectId,
          projectName: project.data?.name ?? "Project",
          stash,
          groupId: record?.groupId,
          current: { label: record?.name ?? "Endpoint" },
        })}
      />
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
        />
      ) : null}
    </div>
    )}</ProjectFrame>
  );
}
