"use client";

import { motion } from "framer-motion";
import { MoreHorizontalIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectDialog } from "@/features/projects/components/project-dialog";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from "@/features/projects/queries";
import { formatDate } from "@/lib/format";
import { canManageProject } from "@/lib/permissions";
import type { ProjectListItem } from "@/lib/types";
import type { ProjectInput } from "@/lib/validators";

export function ProjectBoard() {
  const router = useRouter();
  const projects = useProjects();
  const createProject = useCreateProject();
  const removeProject = useDeleteProject();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProjectListItem | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            The APIs you document, grouped into calm, readable projects.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <PlusIcon data-icon="inline-start" />
          New project
        </Button>
      </div>

      {projects.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : null}

      {projects.isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Could not load projects</EmptyTitle>
            <EmptyDescription>{projects.error.message}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {projects.data && projects.data.length === 0 ? (
        <Empty className="min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PlusIcon />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Create a project, then organize endpoints into stashes like Authentication or Payments.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setCreating(true)}>Create a project</Button>
          </EmptyContent>
        </Empty>
      ) : null}

      {projects.data && projects.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.data.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              onOpen={() => router.push(`/projects/${project.id}`)}
              onEdit={() => setEditing(project)}
              onDelete={() => removeProject.mutate(project.id)}
              deleting={removeProject.isPending}
            />
          ))}
        </div>
      ) : null}

      <ProjectDialog
        open={creating}
        onOpenChange={setCreating}
        title="New project"
        description="Give the API a name your team will recognize."
        pending={createProject.isPending}
        onSubmit={(values) =>
          createProject.mutate(values, {
            onSuccess: () => setCreating(false),
          })
        }
      />
      <EditProjectDialog project={editing} onOpenChange={() => setEditing(null)} />
    </div>
  );
}

function EditProjectDialog({
  project,
  onOpenChange,
}: {
  project: ProjectListItem | null;
  onOpenChange: () => void;
}) {
  const update = useUpdateProject(project?.id ?? "none");
  if (!project) return null;
  return (
    <ProjectDialog
      open
      onOpenChange={(open) => {
        if (!open) onOpenChange();
      }}
      title="Edit project"
      description="Update the name and description. The project link stays the same."
      pending={update.isPending}
      initial={{ name: project.name, description: project.description }}
      onSubmit={(values: ProjectInput) =>
        update.mutate(values, { onSuccess: onOpenChange })
      }
    />
  );
}

function ProjectCard({
  project,
  index,
  onOpen,
  onEdit,
  onDelete,
  deleting,
}: {
  project: ProjectListItem;
  index: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.04 }}
    >
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <button type="button" onClick={onOpen} className="text-left">
              <CardTitle>{project.name}</CardTitle>
            </button>
            {canManageProject(project.role) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Project actions">
                    <MoreHorizontalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
                    <ConfirmDelete
                      title="Delete project?"
                      description="Stashes, endpoints, and invitations in this project will be removed."
                      pending={deleting}
                      onConfirm={onDelete}
                      trigger={
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={(event) => event.preventDefault()}
                        >
                          Delete
                        </DropdownMenuItem>
                      }
                    />
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          <CardDescription className="line-clamp-2 min-h-10">
            {project.description || "No description"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <Link href={`/projects/${project.id}`} className="hover:text-foreground">
            {project.stashCount} stashes · {project.endpointCount} endpoints
          </Link>
        </CardContent>
        <CardFooter className="justify-between">
          <Badge variant="secondary">{project.role}</Badge>
          <span className="text-xs text-muted-foreground">
            Updated {formatDate(project.updatedAt)}
          </span>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
