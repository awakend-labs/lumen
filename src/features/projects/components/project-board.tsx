"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Braces,
  CircleCheck,
  Clock,
  FolderOpen,
  Hourglass,
  Layers,
  LayoutGridIcon,
  ListIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Route,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ProjectDialog } from "@/features/projects/components/project-dialog";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from "@/features/projects/queries";
import { formatUpdatedLabel } from "@/lib/format";
import { canManageProject } from "@/lib/permissions";
import { accentFor } from "@/lib/project-accent";
import { cn } from "@/lib/utils";
import type { ProjectListItem, ProjectStatus } from "@/lib/types";
import type { ProjectInput } from "@/lib/validators";

type ProjectFilter = "all" | ProjectStatus;
type ProjectSort = "updated" | "name";
type BoardView = "grid" | "list";

const FILTER_OPTIONS: { value: ProjectFilter; label: string }[] = [
  { value: "all", label: "All projects" },
  { value: "documented", label: "Documented" },
  { value: "in_progress", label: "In progress" },
];

export function ProjectBoard() {
  const router = useRouter();
  const projects = useProjects();
  const createProject = useCreateProject();
  const removeProject = useDeleteProject();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProjectListItem | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [sort, setSort] = useState<ProjectSort>("updated");
  const [view, setView] = useState<BoardView>("grid");

  const counts = useMemo(() => {
    const all = projects.data ?? [];
    return {
      all: all.length,
      documented: all.filter((project) => project.status === "documented").length,
      in_progress: all.filter((project) => project.status === "in_progress").length,
    };
  }, [projects.data]);

  const filteredProjects = useMemo(() => {
    if (!projects.data) return [];
    const normalized = query.trim().toLowerCase();
    let list = projects.data.filter((project) => {
      if (filter !== "all" && project.status !== filter) return false;
      if (!normalized) return true;
      const haystack = `${project.name} ${project.description ?? ""} ${project.slug}`.toLowerCase();
      return haystack.includes(normalized);
    });
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  }, [filter, projects.data, query, sort]);

  const totalCount = projects.data?.length ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
            {totalCount > 0 ? (
              <Badge
                variant="outline"
                className="gap-2 rounded-full border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-foreground"
              >
                <FolderOpen className="size-3.5 text-primary" />
                {totalCount} {totalCount === 1 ? "project" : "projects"}
              </Badge>
            ) : null}
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            The APIs you document, grouped into calm, readable projects.
          </p>
        </div>
        <Button className="shrink-0" onClick={() => setCreating(true)}>
          <PlusIcon data-icon="inline-start" />
          New project
        </Button>
      </div>

      {projects.data && projects.data.length > 0 ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
            {FILTER_OPTIONS.map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={filter === value ? "secondary" : "ghost"}
                className="h-8 gap-2 rounded-md px-3 text-xs font-medium"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
              >
                {value === "documented" ? (
                  <CircleCheck className="size-3.5 text-stash-green" />
                ) : null}
                {value === "in_progress" ? (
                  <Hourglass className="size-3.5 text-stash-amber" />
                ) : null}
                {label}
                <span className="rounded-full bg-background/70 px-1.5 text-[10px] text-muted-foreground tabular-nums">
                  {counts[value]}
                </span>
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1 sm:max-w-xs">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter projects..."
                className="h-9 bg-background pl-8"
                aria-label="Filter projects"
              />
            </div>
            <Select value={sort} onValueChange={(value) => setSort(value as ProjectSort)}>
              <SelectTrigger className="h-9 w-42 bg-background">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Sort: Last updated</SelectItem>
                <SelectItem value="name">Sort: Name</SelectItem>
              </SelectContent>
            </Select>
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(value) => value && setView(value as BoardView)}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <LayoutGridIcon className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <ListIcon className="size-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      ) : null}

      {projects.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-xl" />
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
        <Empty className="min-h-72 border border-dashed bg-muted/20">
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

      {projects.data && projects.data.length > 0 && filteredProjects.length === 0 ? (
        <Empty className="min-h-48 border border-dashed">
          <EmptyHeader>
            <EmptyTitle>No projects match</EmptyTitle>
            <EmptyDescription>Try another filter or clear your search.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Reset filters
            </Button>
          </EmptyContent>
        </Empty>
      ) : null}

      {filteredProjects.length > 0 ? (
        <div
          className={cn(
            "gap-4",
            view === "grid" ? "grid items-stretch sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col",
          )}
        >
          {filteredProjects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              view={view}
              onOpen={() => router.push(`/projects/${project.id}`)}
              onEdit={() => setEditing(project)}
              onDelete={() => removeProject.mutate(project.id)}
              deleting={removeProject.isPending}
            />
          ))}
          <CreateProjectCard view={view} onCreate={() => setCreating(true)} />
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
      description="Update the name, description, and status. The project link stays the same."
      pending={update.isPending}
      initial={{
        name: project.name,
        description: project.description,
        status: project.status,
      }}
      onSubmit={(values: ProjectInput) =>
        update.mutate(values, { onSuccess: onOpenChange })
      }
    />
  );
}

function CreateProjectCard({
  view,
  onCreate,
}: {
  view: BoardView;
  onCreate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className={cn(
        "group flex h-full min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/35 bg-linear-to-br from-primary/10 via-background to-muted/30 px-6 py-8 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:from-primary/15 hover:shadow-md",
        view === "list" && "min-h-0 flex-row justify-start px-5 py-4 text-left",
      )}
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105",
          view === "list" && "size-9 shrink-0",
        )}
      >
        <PlusIcon className="size-5" />
      </span>
      <div className={cn("flex flex-col gap-1", view === "list" && "items-start")}>
        <span className="text-sm font-medium">Create another project</span>
        <span className="text-xs text-muted-foreground">
          Start from scratch and add stashes as you document endpoints.
        </span>
      </div>
    </button>
  );
}

function ProjectCard({
  project,
  index,
  view,
  onOpen,
  onEdit,
  onDelete,
  deleting,
}: {
  project: ProjectListItem;
  index: number;
  view: BoardView;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const accent = accentFor(project.id);
  const stashLabel = project.stashCount === 1 ? "stash" : "stashes";
  const endpointLabel = project.endpointCount === 1 ? "endpoint" : "endpoints";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.04 }}
      className={view === "list" ? "w-full" : "h-full"}
    >
      <Card
        role="link"
        tabIndex={0}
        aria-label={`Open ${project.name}`}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            onOpen();
          }
        }}
        className={cn(
          "group relative h-full cursor-pointer gap-0 overflow-hidden border-border/60 bg-linear-to-br from-muted/20 via-card to-background py-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          accent.hover,
          view === "list" && "flex flex-row items-stretch",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                accent.tile,
              )}
              aria-hidden
            >
              <Braces className="size-5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <CardTitle className="truncate text-base leading-tight">{project.name}</CardTitle>
              <CardDescription className="mt-1 line-clamp-2 text-sm leading-relaxed">
                {project.description || "No description yet."}
              </CardDescription>
            </div>
            {canManageProject(project.role) ? (
              <div
                className="-mt-1 -mr-1 shrink-0"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
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
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1 text-xs text-muted-foreground">
              <Layers className={cn("size-3.5", accent.icon)} />
              <span className="font-medium text-foreground">{project.stashCount}</span>
              {stashLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1 text-xs text-muted-foreground">
              <Route className={cn("size-3.5", accent.icon)} />
              <span className="font-medium text-foreground">{project.endpointCount}</span>
              {endpointLabel}
            </span>
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5 text-stash-green" />
              {formatUpdatedLabel(project.updatedAt)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
              Open
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
