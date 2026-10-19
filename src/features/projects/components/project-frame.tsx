"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/features/projects/queries";
import type { ProjectDetail } from "@/lib/types";
import { canEditContent } from "@/lib/permissions";

export function ProjectFrame({
  projectId,
  children,
  editable = false,
}: {
  projectId: string;
  children: (project: ProjectDetail) => React.ReactNode;
  editable?: boolean;
}) {
  const project = useProject(projectId);
  if (project.isLoading) {
    return (
      <div className="lumen-page flex flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    );
  }

  if (project.isError || !project.data) {
    return (
      <div className="lumen-page">
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Project unavailable</EmptyTitle>
            <EmptyDescription>
              {project.error?.message ?? "This project could not be loaded."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/dashboard">Back to projects</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  if (editable && !canEditContent(project.data.role)) {
    return <div className="lumen-page"><Empty className="border">
      <EmptyHeader><EmptyTitle>Read-only access</EmptyTitle><EmptyDescription>You can view this project, but only owners and editors can change endpoints.</EmptyDescription></EmptyHeader>
      <EmptyContent><Button asChild><Link href={`/projects/${projectId}`}>Back to project</Link></Button></EmptyContent>
    </Empty></div>;
  }
  return <>{children(project.data)}</>;
}
