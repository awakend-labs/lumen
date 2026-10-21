"use client";

import { DeferredDialog } from "@/components/deferred-dialog";

import * as m from "framer-motion/m";
import {
  ArrowRight,
  ArrowUpDownIcon,
  Clock,
  Layers,
  LayoutGridIcon,
  ListIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Route,
  SearchIcon,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { lazy, useMemo, useRef, useState } from "react";
const loadRenameDialog = () => import("@/components/rename-dialog").then(module => ({ default: module.RenameDialog }));
const RenameDialog = lazy(loadRenameDialog);
import { ConfirmDelete } from "@/components/confirm-delete";
import { CompactMarkdown } from "@/components/compact-markdown";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
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
import { formatUpdatedLabel, stashDotClass } from "@/lib/format";
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
      documented: all.filter((project) => project.status === "documented")
        .length,
      in_progress: all.filter((project) => project.status === "in_progress")
        .length,
    };
  }, [projects.data]);

  const filteredProjects = useMemo(() => {
    if (!projects.data) return [];
    const normalized = query.trim().toLowerCase();
    let list = projects.data.filter((project) => {
      if (filter !== "all" && project.status !== filter) return false;
      if (!normalized) return true;
      const haystack =
        `${project.name} ${project.description ?? ""} ${project.slug}`.toLowerCase();
      return haystack.includes(normalized);
    });
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  }, [filter, projects.data, query, sort]);

  return (
    <div className="lumen-page flex flex-col gap-5 pt-5 pb-10 md:gap-6 md:pt-6 md:pb-12">
      <div>
        <p className="eyebrow mb-1.5">Your workspace / Overview</p>
        <PageHeader
          title="Projects"
          description="Open a project to document endpoints, organize stashes, and share access with your team."
          actions={
            <Button className="h-9 shadow-sm" onClick={() => setCreating(true)}>
              <PlusIcon data-icon="inline-start" />
              New project
            </Button>
          }
        />
      </div>

      {projects.data && projects.data.length > 0 ? (
        <WorkspaceSummary projects={projects.data} />
      ) : null}

      {projects.data && projects.data.length > 0 ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 border-b border-border pb-1">
            {FILTER_OPTIONS.map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={filter === value ? "secondary" : "ghost"}
                className={cn(
                  "h-9 gap-2 rounded-none border-x-0 border-t-0 border-b-2 px-3 text-xs font-medium",
                  filter === value
                    ? "border-primary bg-transparent shadow-none hover:bg-muted/50"
                    : "border-transparent",
                )}
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
              >
                {label}
                <span className="rounded-sm bg-background/70 px-1.5 text-[10px] text-muted-foreground tabular-nums">
                  {counts[value]}
                </span>
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1 sm:min-w-64 sm:max-w-sm xl:min-w-72">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter projects..."
                className="h-8 min-h-8 rounded-sm bg-background py-0 pl-8 text-sm"
                aria-label="Filter projects"
              />
            </div>
            <Select
              value={sort}
              onValueChange={(value) => setSort(value as ProjectSort)}
            >
              <SelectTrigger
                size="sm"
                aria-label="Sort projects"
                className="h-7 min-h-7 w-auto min-w-36 gap-2 bg-background py-0 pr-2 pl-2.5 text-sm dark:bg-white/3"
              >
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="updated">
                  <Clock
                    className="size-3.5 text-muted-foreground"
                    aria-hidden
                  />
                  Last updated
                </SelectItem>
                <SelectItem value="name">
                  <ArrowUpDownIcon
                    className="size-3.5 text-muted-foreground"
                    aria-hidden
                  />
                  Name (A–Z)
                </SelectItem>
              </SelectContent>
            </Select>
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(value) => value && setView(value as BoardView)}
              variant="outline"
              size="sm"
              spacing={2}
              className="gap-1.5 border-0 bg-transparent p-0 shadow-none"
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
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,21rem),1fr))]">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-52 rounded-md" />
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
              Create a project, then organize endpoints into stashes like
              Authentication or Payments.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setCreating(true)}>Create a project</Button>
          </EmptyContent>
        </Empty>
      ) : null}

      {projects.data &&
      projects.data.length > 0 &&
      filteredProjects.length === 0 ? (
        <Empty className="min-h-48 border border-dashed">
          <EmptyHeader>
            <EmptyTitle>No projects match</EmptyTitle>
            <EmptyDescription>
              Try another filter or clear your search.
            </EmptyDescription>
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
            "gap-3",
            view === "grid"
              ? "grid items-stretch [grid-template-columns:repeat(auto-fill,minmax(min(100%,21rem),1fr))]"
              : "flex flex-col",
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
      <EditProjectDialog
        project={editing}
        onOpenChange={() => setEditing(null)}
      />
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
        baseUrl: project.baseUrl,
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
        "create-tile group col-span-full flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors",
        view === "grid" && "mt-2",
        view === "list" && "min-h-0 flex-row justify-start px-5 py-4 text-left",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground",
          view === "list" && "size-9 shrink-0",
        )}
      >
        <PlusIcon className="size-5" />
      </span>
      <div
        className={cn("flex flex-col gap-1", view === "list" && "items-start")}
      >
        <span className="text-sm font-medium">Create another project</span>
        <span className="text-xs text-muted-foreground">
          A new space for your next API.
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
  const [renaming, setRenaming] = useState(false);
  const actionTrigger = useRef<HTMLButtonElement>(null);
  const stashLabel = project.stashCount === 1 ? "stash" : "stashes";
  const endpointLabel = project.endpointCount === 1 ? "endpoint" : "endpoints";
  return (
    <m.div
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
          if (
            event.target === event.currentTarget &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            onOpen();
          }
        }}
        className={cn(
          "project-card group relative h-full cursor-pointer gap-0 overflow-hidden rounded-md py-0 transition-[border-color,box-shadow,background-color] duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          view === "list" && "flex flex-row items-stretch",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-3 p-4 transition-colors duration-200",
            "group-hover:bg-foreground/[0.035] dark:group-hover:bg-white/[0.05]",
            view === "list" && "justify-center",
          )}
        >
          <div className="flex items-start gap-2.5">
            <div className="min-w-0 flex-1">
              <CardTitle
                title={project.name}
                className="truncate text-[1.0625rem] font-semibold tracking-[0.02em] leading-snug text-foreground transition-colors group-hover:text-foreground"
              >
                {project.name}
              </CardTitle>
              <CompactMarkdown
                className="mt-0.5 max-h-[4.5rem] overflow-y-auto text-[13px] leading-snug"
                content={project.description || "No description yet."}
              />
            </div>
            {canManageProject(project.role) ? (
              <div
                className="-mt-1 -mr-1 shrink-0"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      ref={actionTrigger}
                      aria-label="Project actions"
                    >
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem onSelect={() => setRenaming(true)}>
                        Rename
                      </DropdownMenuItem>
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

          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="size-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {project.stashCount}
              </span>
              {stashLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-transparent py-1 text-xs text-muted-foreground">
              <Route className="size-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {project.endpointCount}
              </span>
              {endpointLabel}
            </span>
          </div>

          {view === "grid" && project.previewStashes.length > 0 ? (
            <div
              role="group"
              aria-label="Latest stashes"
              className="space-y-1.5 rounded-md bg-background p-2"
            >
              {project.previewStashes.map((stash) => (
                <div key={stash.id} className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2 shrink-0 rounded-sm",
                      stashDotClass(stash.color),
                    )}
                  />
                  <span className="truncate text-xs text-muted-foreground">
                    {stash.name}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  "size-1.5 rounded-sm",
                  project.status === "documented"
                    ? "bg-stash-green"
                    : "bg-primary",
                )}
              />
              {formatUpdatedLabel(project.updatedAt)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
              {project.status === "documented" ? "Documented" : "In progress"}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Card>
      {renaming && <DeferredDialog returnFocus={actionTrigger} title="Rename project" onClose={() => setRenaming(false)}><RenameDialog
        kind="project"
        projectId={project.id}
        name={project.name}
        open={renaming}
        onOpenChange={setRenaming}
      /></DeferredDialog>}
    </m.div>
  );
}

function WorkspaceSummary({ projects }: { projects: ProjectListItem[] }) {
  const endpoints = projects.reduce(
    (sum, project) => sum + project.endpointCount,
    0,
  );
  const stashes = projects.reduce(
    (sum, project) => sum + project.stashCount,
    0,
  );
  const apiGroups = projects.reduce(
    (sum, project) => sum + project.apiGroupCount,
    0,
  );
  return (
    <section
      aria-label="Workspace overview"
      className="grid grid-cols-2 gap-3 border-y border-border py-4 sm:grid-cols-4 sm:gap-5"
    >
      {[
        {
          label: "Projects",
          value: projects.length,
          note: "In this workspace",
        },
        {
          label: "Endpoints",
          value: endpoints,
          note: "Every path accounted for",
        },
        {
          label: "Stashes",
          value: stashes,
          note: "Color-coded collections",
        },
        {
          label: "API groups",
          value: apiGroups,
          note: "Folders within folders",
        },
      ].map(({ label, value, note }) => (
        <div key={label} className="min-w-0">
          <p className="eyebrow text-[9px] sm:text-[10px]">{label}</p>
          <p className="mt-1 text-2xl font-medium tracking-[-0.06em] tabular-nums sm:text-[1.75rem]">
            {String(value).padStart(2, "0")}
            <span className="ml-1 text-primary">.</span>
          </p>
          <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
            {note}
          </p>
        </div>
      ))}
    </section>
  );
}
