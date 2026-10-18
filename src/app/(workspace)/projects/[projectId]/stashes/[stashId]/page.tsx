"use client";

import { MoreHorizontalIcon, PencilIcon, PlusIcon, Route, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { ConfirmDelete } from "@/components/confirm-delete";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { EndpointBrowser } from "@/features/endpoints/components/endpoint-browser";
import { ProjectFrame } from "@/features/projects/components/project-frame";
import { StashDialog } from "@/features/stashes/components/stash-dialog";
import { StashStatusControl } from "@/features/stashes/components/stash-status-control";
import { useDeleteStash, useUpdateStash } from "@/features/stashes/queries";
import { stashDotClass } from "@/lib/format";
import { canEditContent } from "@/lib/permissions";
import type { ProjectDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function StashPage({
  params,
}: {
  params: Promise<{ projectId: string; stashId: string }>;
}) {
  const { projectId, stashId } = use(params);

  return (
    <ProjectFrame projectId={projectId}>
      {(project) => <StashView project={project} stashId={stashId} />}
    </ProjectFrame>
  );
}

function StashView({
  project,
  stashId,
}: {
  project: ProjectDetail;
  stashId: string;
}) {
  const router = useRouter();
  const stash = project.stashes.find((item) => item.id === stashId);
  const editable = canEditContent(project.role);
  const [editing, setEditing] = useState(false);
  const update = useUpdateStash(project.id);
  const remove = useDeleteStash(project.id);

  if (!stash) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Stash not found</EmptyTitle>
            <EmptyDescription>This stash may have been removed.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href={`/projects/${project.id}`}>Back to project</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const endpointCount = stash.endpoints.length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Breadcrumb>
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
            <BreadcrumbPage>{stash.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 max-w-2xl flex-1 flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <span className={cn("size-2.5 shrink-0 rounded-full", stashDotClass(stash.color))} />
            <h1 className="truncate text-2xl font-semibold tracking-tight">{stash.name}</h1>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {stash.description || "Endpoints documented in this stash."}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1 text-xs text-muted-foreground">
              <Route className="size-3.5 text-primary" />
              <span className="font-medium text-foreground">{endpointCount}</span>
              {endpointCount === 1 ? "endpoint" : "endpoints"}
            </span>
            <StashStatusControl
              projectId={project.id}
              stashId={stash.id}
              status={stash.status}
              role={project.role}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {editable ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-9" aria-label="Stash actions">
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setEditing(true)}>
                    <PencilIcon data-icon="inline-start" />
                    Edit stash
                  </DropdownMenuItem>
                  <ConfirmDelete
                    title="Delete stash?"
                    description="Endpoints inside this stash will be deleted too."
                    pending={remove.isPending}
                    onConfirm={() =>
                      remove.mutate(stash.id, {
                        onSuccess: () => router.push(`/projects/${project.id}`),
                      })
                    }
                    trigger={
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={(event) => event.preventDefault()}
                      >
                        <Trash2Icon data-icon="inline-start" />
                        Delete stash
                      </DropdownMenuItem>
                    }
                  />
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {editable ? (
            <Button asChild className="h-9">
              <Link href={`/projects/${project.id}/endpoints/new?stash=${stash.id}`}>
                <PlusIcon data-icon="inline-start" />
                New endpoint
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <EndpointBrowser project={project} stashId={stash.id} />

      <StashDialog
        open={editing}
        onOpenChange={setEditing}
        stash={stash}
        pending={update.isPending}
        onSubmit={(values) =>
          update.mutate(
            { stashId: stash.id, input: values },
            { onSuccess: () => setEditing(false) },
          )
        }
      />
    </div>
  );
}
