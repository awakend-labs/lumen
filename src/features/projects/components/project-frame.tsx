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

export function ProjectFrame({
  projectId,
  children,
}: {
  projectId: string;
  children: (project: ProjectDetail) => React.ReactNode;
}) {
  const project = useProject(projectId);

  if (project.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (project.isError || !project.data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
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

  return <>{children(project.data)}</>;
}
