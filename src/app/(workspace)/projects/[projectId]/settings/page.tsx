"use client";

import { ArrowLeftIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
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
  params: Promise<{ projectId: string; }>;
}) {
  const { projectId } = use(params);

  return (
    <ProjectFrame projectId={projectId} editable>
      {(project) => (
        <div className="lumen-page flex flex-col gap-6">
          <header className="flex flex-col gap-5 border-b border-border/70 pb-5">
            <div className="mb-4 flex min-w-0 items-center gap-3 sm:mb-5">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1.5 px-2.5"
              >
                <Link href={`/projects/${project.id}`}>
                  <ArrowLeftIcon className="size-3.5" aria-hidden />
                  Back
                </Link>
              </Button>
              <Breadcrumb className="min-w-0">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/dashboard">Projects</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
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
            </div>
            <PageHeader
              icon={SettingsIcon}
              title="Settings"
              description={`Members, invitations, and access for ${project.name}.`}
            />
          </header>
          <ProjectAuthSettings key={project.id} project={project} />
          <ProjectSettings projectId={project.id} role={project.role} />
        </div>
      )}
    </ProjectFrame>
  );
}
