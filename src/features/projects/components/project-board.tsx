"use client";

import { motion } from "framer-motion";
import {
  Braces,
  CircleCheck,
  Clock,
  Crown,
  Eye,
  FolderOpen,
  Hourglass,
  Layers,
  LayoutGridIcon,
  ListIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Route,
  SearchIcon,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ConfirmDelete } from "@/components/confirm-delete";
import { MethodBadge } from "@/components/method-badge";
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
            view === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col",
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
        "group flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-6 py-8 text-center transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10",
        view === "list" && "min-h-0 flex-row justify-start px-5 py-4 text-left",
      )}
    >
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105",
          view === "list" && "size-10 shrink-0",
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

// Each project gets a stable accent color derived from its id, so cards feel distinct
// while staying within the theme palette. Class names are written out in full so
// Tailwind can detect them.
const ACCENTS = [
  {
    bar: "bg-stash-blue",
    tile: "bg-stash-blue/15 text-stash-blue",
    icon: "text-stash-blue",
    hover: "hover:border-stash-blue/50",
  },
  {
    bar: "bg-stash-green",
    tile: "bg-stash-green/15 text-stash-green",
    icon: "text-stash-green",
    hover: "hover:border-stash-green/50",
  },
  {
    bar: "bg-stash-violet",
    tile: "bg-stash-violet/15 text-stash-violet",
    icon: "text-stash-violet",
    hover: "hover:border-stash-violet/50",
  },
  {
    bar: "bg-stash-amber",
    tile: "bg-stash-amber/15 text-stash-amber",
    icon: "text-stash-amber",
    hover: "hover:border-stash-amber/50",
  },
  {
    bar: "bg-stash-pink",
    tile: "bg-stash-pink/15 text-stash-pink",
    icon: "text-stash-pink",
    hover: "hover:border-stash-pink/50",
  },
  {
    bar: "bg-stash-teal",
    tile: "bg-stash-teal/15 text-stash-teal",
    icon: "text-stash-teal",
    hover: "hover:border-stash-teal/50",
  },
  {
    bar: "bg-stash-red",
    tile: "bg-stash-red/15 text-stash-red",
    icon: "text-stash-red",
    hover: "hover:border-stash-red/50",
  },
  {
    bar: "bg-stash-slate",
    tile: "bg-stash-slate/15 text-stash-slate",
    icon: "text-stash-slate",
    hover: "hover:border-stash-slate/50",
  },
];

function accentFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return ACCENTS[hash % ACCENTS.length];
}

const ROLE_META: Record<string, { label: string; icon: typeof Crown; className: string }> = {
  owner: {
    label: "Owner",
    icon: Crown,
    className: "bg-primary/20 text-foreground",
  },
  editor: {
    label: "Editor",
    icon: PencilIcon,
    className: "bg-stash-blue/15 text-stash-blue",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    className: "bg-muted text-muted-foreground",
  },
};

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
  const role = ROLE_META[project.role] ?? ROLE_META.viewer;
  const RoleIcon = role.icon;
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
          "group relative h-full cursor-pointer gap-0 overflow-hidden border-border/70 bg-card py-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          accent.hover,
          view === "list" && "flex flex-row items-stretch",
        )}
      >
        <span
          className={cn("absolute inset-x-0 top-0 h-1", accent.bar)}
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <CardHeader className="gap-3 pt-6 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                    accent.tile,
                  )}
                  aria-hidden
                >
                  <Braces className="size-5" />
                </span>
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{project.name}</CardTitle>
                  {project.slug ? (
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                      /{project.slug}
                    </span>
                  ) : null}
                </div>
              </div>
              {canManageProject(project.role) ? (
                <div
                  className="shrink-0"
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
            <CardDescription className="line-clamp-2 min-h-10 text-[13px] leading-relaxed">
              {project.description || "No description yet."}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-3 pb-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href={`/projects/${project.id}`}
                onClick={(event) => event.stopPropagation()}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/70 px-2 py-1 text-muted-foreground transition-colors hover:text-foreground">
                  <Layers className={cn("size-3.5", accent.icon)} />
                  <span className="font-medium text-foreground">{project.stashCount}</span>
                  {stashLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/70 px-2 py-1 text-muted-foreground transition-colors hover:text-foreground">
                  <Route className={cn("size-3.5", accent.icon)} />
                  <span className="font-medium text-foreground">{project.endpointCount}</span>
                  {endpointLabel}
                </span>
              </Link>
            </div>

            {project.previewEndpoints.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                  <Sparkles className={cn("size-3", accent.icon)} />
                  Latest routes
                </span>
                {project.previewEndpoints.map((endpoint) => (
                  <div
                    key={`${endpoint.method}-${endpoint.path}`}
                    className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2 py-1.5"
                  >
                    <MethodBadge
                      method={endpoint.method}
                      className="h-5 min-w-13 text-[10px]"
                    />
                    <span className="truncate font-mono text-[11px] text-muted-foreground">
                      {endpoint.path}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                <Sparkles className={cn("size-3.5 shrink-0", accent.icon)} />
                Add stashes and endpoints to preview routes here.
              </div>
            )}
          </CardContent>

          <CardFooter className="mt-auto items-center justify-between border-t border-border/50 bg-muted/15 py-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                role.className,
              )}
            >
              <RoleIcon className="size-3" />
              {role.label}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {formatUpdatedLabel(project.updatedAt)}
            </span>
          </CardFooter>
        </div>
      </Card>
    </motion.div>
  );
}
