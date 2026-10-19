"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
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

const subscribeToHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

export function ProjectFrame({
  projectId,
  children,
}: {
  projectId: string;
  children: (project: ProjectDetail) => React.ReactNode;
}) {
  const project = useProject(projectId);
  // The sidebar can populate this query before a streamed page hydrates.
  // Keep its first render consistent with the server's loading skeleton.
  const hydrated = useSyncExternalStore(subscribeToHydration, clientHydrated, serverHydrated);

  if (!hydrated || project.isLoading) {
    return (
      <div className="lumen-page flex flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
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

  return <>{children(project.data)}</>;
}
