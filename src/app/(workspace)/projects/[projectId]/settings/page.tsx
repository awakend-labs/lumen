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
import { ProjectAuthSettings } from "@/features/projects/components/project-auth-settings";
import { ProjectSettings } from "@/features/members/components/project-settings";
import { ProjectFrame } from "@/features/projects/components/project-frame";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

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
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Members and invitations for {project.name}.
            </p>
          </div>
          <ProjectAuthSettings key={project.id} project={project} />
          <ProjectSettings projectId={project.id} role={project.role} />
        </div>
      )}
    </ProjectFrame>
  );
}
