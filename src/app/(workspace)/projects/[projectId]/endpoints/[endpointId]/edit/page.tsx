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
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export default function EditEndpointPage({
  params,
}: {
  params: Promise<{ projectId: string; endpointId: string; }>;
}) {
  const { projectId, endpointId } = use(params);
  const endpoint = useEndpoint(projectId, endpointId);

  return (
    <ProjectFrame projectId={projectId} editable>
      {(project) => (
        <div className="lumen-page flex flex-col gap-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/projects/${project.id}`}>{project.name}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {endpoint.data && <><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbLink asChild><Link href={`/projects/${project.id}/stashes/${endpoint.data.endpoint.stashId}`}>{project.stashes.find(stash => stash.id === endpoint.data.endpoint.stashId)?.name ?? "Stash"}</Link></BreadcrumbLink></BreadcrumbItem></>}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Edit endpoint</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">Edit endpoint</h1>
            <p className="text-sm text-muted-foreground">
              Update the route, parameters, and responses. Saving keeps this endpoint in its current stash.
            </p>
          </div>
          {endpoint.isLoading ? <Skeleton className="h-96 w-full" /> : null}
          {endpoint.isError && <Empty className="border"><EmptyHeader><EmptyTitle>Endpoint unavailable</EmptyTitle><EmptyDescription>{endpoint.error.message}</EmptyDescription></EmptyHeader><EmptyContent><Button asChild variant="outline"><Link href={`/projects/${projectId}`}>Back to project</Link></Button></EmptyContent></Empty>}
          {endpoint.data && !endpoint.isError ? (
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
