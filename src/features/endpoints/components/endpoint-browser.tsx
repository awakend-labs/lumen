"use client";

import { DeferredDialog } from "@/components/deferred-dialog";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as m from "framer-motion/m";
import {
  ChevronDownIcon,
  GripVerticalIcon,
  InboxIcon,
  LayoutGridIcon,
  ListIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  TerminalSquare,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { lazy, useRef, useState } from "react";
const loadMoveEndpointDialog = () => import("./move-endpoint-dialog").then(module => ({ default: module.MoveEndpointDialog }));
const MoveEndpointDialog = lazy(loadMoveEndpointDialog);
const loadRenameDialog = () => import("@/components/rename-dialog").then(module => ({ default: module.RenameDialog }));
const RenameDialog = lazy(loadRenameDialog);
import { ConfirmDelete } from "@/components/confirm-delete";
import { CompactMarkdown } from "@/components/compact-markdown";
import {
  EndpointVersionBadge,
  MethodBadge,
  statusTextClass,
} from "@/components/method-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useDeleteEndpoint,
  useReorderEndpoints,
} from "@/features/endpoints/queries";
import { StashDialog } from "@/features/stashes/components/stash-dialog";
import {
  ApiGroupControl,
  ApiGroupSection,
} from "@/features/stashes/components/api-group-section";
import {
  useDeleteStash,
  useReorderStashes,
  useUpdateStash,
} from "@/features/stashes/queries";
import { useViewMode } from "@/hooks/use-view-mode";
import { stashDotClass } from "@/lib/format";
import { canEditContent } from "@/lib/permissions";
import type { EndpointSummary, ProjectSummary, StashSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

type VisibleStash = { stash: StashSummary; endpoints: EndpointSummary[] };

export function EndpointBrowser({
  project,
  stashId,
  onCreateStash,
}: {
  project: ProjectSummary;
  stashId?: string;
  onCreateStash?: () => void;
}) {
  const [mode, setMode] = useViewMode();
  const [query, setQuery] = useState("");
  const editable = canEditContent(project.role);
  const reorder = useReorderStashes(project.id);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const baseStashes = stashId
    ? project.stashes.filter((stash) => stash.id === stashId)
    : project.stashes;
  const normalized = query.trim().toLowerCase();
  const isFiltering = normalized.length > 0;
  // Drag reordering is always on for owners and editors, but only on the full,
  // unfiltered list so indexes stay correct.
  const canReorder = editable && !isFiltering;

  const visible: VisibleStash[] = baseStashes.flatMap((stash) => {
    if (!isFiltering) return [{ stash, endpoints: stash.endpoints }];
    if (stashId) {
      return [
        {
          stash,
          endpoints: stash.endpoints.filter(
            (endpoint) =>
              matchesEndpoint(endpoint, normalized) ||
              stash.groups.some(
                (group) =>
                  group.id === endpoint.groupId &&
                  group.name.toLowerCase().includes(normalized),
              ),
          ),
        },
      ];
    }
    const stashMatch = stash.name.toLowerCase().includes(normalized);
    const endpoints = stash.endpoints.filter(
      (endpoint) =>
        stashMatch ||
        matchesEndpoint(endpoint, normalized) ||
        stash.groups.some(
          (group) =>
            group.id === endpoint.groupId &&
            group.name.toLowerCase().includes(normalized),
        ),
    );
    return stashMatch ||
      endpoints.length > 0 ||
      stash.groups.some((group) =>
        group.name.toLowerCase().includes(normalized),
      )
      ? [{ stash, endpoints }]
      : [];
  });

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = baseStashes.map((stash) => stash.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    reorder.mutate(arrayMove(ids, oldIndex, newIndex));
  }

  if (baseStashes.length === 0) {
    return (
      <Empty className="min-h-64 border">
        <EmptyHeader>
          <EmptyTitle>
            {stashId ? "Stash not found" : "No stashes yet"}
          </EmptyTitle>
          <EmptyDescription>
            {stashId
              ? "This stash may have been removed."
              : "Create a stash to start documenting endpoints."}
          </EmptyDescription>
        </EmptyHeader>
        {!stashId && onCreateStash && editable ? (
          <EmptyContent>
            <Button onClick={onCreateStash}>
              <PlusIcon data-icon="inline-start" />
              Create a stash
            </Button>
          </EmptyContent>
        ) : stashId ? (
          <EmptyContent>
            <Button asChild>
              <Link href={`/projects/${project.id}`}>Back to project</Link>
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              stashId ? "Filter endpoints..." : "Filter stashes or routes..."
            }
            aria-label={
              stashId ? "Filter endpoints" : "Filter stashes or routes"
            }
            className="h-9 rounded-sm bg-background pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {editable && stashId && (
            <ApiGroupControl projectId={project.id} stashId={stashId} />
          )}
          {editable && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-sm px-3 shadow-none"
            >
              <Link
                href={`/projects/${project.id}/endpoints/new?import=curl${stashId ? `&stash=${stashId}` : ""}`}
              >
                <TerminalSquare className="size-3.5" />
                Import cURL
              </Link>
            </Button>
          )}
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={2}
            value={mode}
            onValueChange={(value) => {
              if (value === "grid" || value === "list") setMode(value);
            }}
            className="gap-1.5 border-0 bg-transparent p-0 shadow-none"
          >
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <LayoutGridIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <ListIcon />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {visible.length === 0 ? (
        <Empty className="min-h-48 border border-dashed">
          <EmptyHeader>
            <EmptyTitle>No matches</EmptyTitle>
            <EmptyDescription>
              Nothing matches &ldquo;{query.trim()}&rdquo;.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => setQuery("")}>
              Clear filter
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={visible.map(({ stash }) => stash.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-4">
              {visible.map(({ stash, endpoints }) => (
                <StashSection
                  key={stash.id}
                  projectId={project.id}
                  stash={stash}
                  endpoints={endpoints}
                  editable={editable}
                  canReorder={canReorder}
                  filtering={isFiltering}
                  groupQuery={normalized}
                  mode={mode}
                  showStashLink={!stashId}
                  bare={Boolean(stashId)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {editable && !stashId && onCreateStash && !isFiltering ? (
        <button
          type="button"
          onClick={onCreateStash}
          className="create-tile group flex w-full cursor-pointer flex-col items-center justify-center gap-2 px-6 py-7 text-center transition-colors"
        >
          <span className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <PlusIcon className="size-5" />
          </span>
          <span className="text-sm font-medium">Create another stash</span>
          <span className="text-xs text-muted-foreground">
            Group endpoints into logical resources like auth, users, or
            webhooks.
          </span>
        </button>
      ) : null}
    </div>
  );
}

function matchesEndpoint(endpoint: EndpointSummary, q: string) {
  return (
    endpoint.name.toLowerCase().includes(q) ||
    endpoint.path.toLowerCase().includes(q) ||
    endpoint.method.toLowerCase().includes(q) ||
    (endpoint.description ?? "").toLowerCase().includes(q) ||
    endpoint.version.toLowerCase().includes(q)
  );
}

function StashSection({
  projectId,
  stash,
  endpoints,
  editable,
  canReorder,
  filtering,
  groupQuery,
  mode,
  showStashLink,
  bare = false,
}: {
  projectId: string;
  stash: StashSummary;
  endpoints: EndpointSummary[];
  editable: boolean;
  canReorder: boolean;
  filtering: boolean;
  groupQuery: string;
  mode: "grid" | "list";
  showStashLink: boolean;
  bare?: boolean;
}) {
  const sortable = useSortable({
    id: stash.id,
    disabled: !canReorder || !showStashLink,
  });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const actionTrigger = useRef<HTMLButtonElement>(null);
  const update = useUpdateStash(projectId);
  const remove = useDeleteStash(projectId);
  const reorderEndpoints = useReorderEndpoints(projectId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = stash.endpoints.map((endpoint) => endpoint.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    reorderEndpoints.mutate({
      stashId: stash.id,
      ids: arrayMove(ids, oldIndex, newIndex),
    });
  }

  const renderEndpoints = (items: EndpointSummary[]) =>
    items.map((endpoint) => (
      <EndpointItem
        key={endpoint.id}
        projectId={projectId}
        endpoint={endpoint}
        mode={mode}
        editable={editable}
        canReorder={canReorder}
      />
    ));

  const groupedBody = stash.groups.length ? (
    <div className="flex flex-col gap-4">
      {stash.groups
        .filter(
          (group) =>
            !filtering ||
            group.name.toLowerCase().includes(groupQuery) ||
            endpoints.some((endpoint) => endpoint.groupId === group.id),
        )
        .map((group) => {
          const items = endpoints.filter(
            (endpoint) => endpoint.groupId === group.id,
          );
          return (
            <ApiGroupSection
              key={group.id}
              id={`api-group-${group.id}`}
              name={group.name}
              count={items.length}
              filtering={filtering}
              actions={
                editable ? (
                  <ApiGroupControl
                    projectId={projectId}
                    stashId={stash.id}
                    group={group}
                  />
                ) : undefined
              }
            >
              {items.length ? (
                <EndpointLayout mode={mode}>
                  {renderEndpoints(items)}
                </EndpointLayout>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {filtering
                    ? "No matching endpoints."
                    : "No endpoints yet. Choose this group when creating or editing an endpoint."}
                </p>
              )}
            </ApiGroupSection>
          );
        })}
      {endpoints.some((endpoint) => !endpoint.groupId) && (
        <ApiGroupSection
          name="Ungrouped APIs"
          count={endpoints.filter((endpoint) => !endpoint.groupId).length}
          filtering={filtering}
        >
          <EndpointLayout mode={mode}>
            {renderEndpoints(endpoints.filter((endpoint) => !endpoint.groupId))}
          </EndpointLayout>
        </ApiGroupSection>
      )}
    </div>
  ) : (
    <EndpointLayout mode={mode}>{renderEndpoints(endpoints)}</EndpointLayout>
  );

  const endpointBody =
    endpoints.length === 0 &&
    (stash.groups.length === 0 ||
      (filtering &&
        !stash.groups.some((group) =>
          group.name.toLowerCase().includes(groupQuery),
        ))) ? (
      filtering ? (
        <p className="text-sm text-muted-foreground">
          No matching endpoints in this stash.
        </p>
      ) : editable ? (
        <EmptyStashState projectId={projectId} stashId={stash.id} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No endpoints in this stash yet.
        </p>
      )
    ) : canReorder ? (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={endpoints.map((endpoint) => endpoint.id)}
          strategy={verticalListSortingStrategy}
        >
          {groupedBody}
        </SortableContext>
      </DndContext>
    ) : (
      groupedBody
    );

  if (bare) {
    return endpointBody;
  }

  return (
    <section
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "overflow-hidden rounded-md border border-border bg-card",
        sortable.isDragging && "shadow-lg ring-2 ring-primary/40",
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {canReorder && showStashLink ? (
              <button
                type="button"
                className="shrink-0 self-center text-muted-foreground"
                aria-label="Reorder stash"
                {...sortable.attributes}
                {...sortable.listeners}
              >
                <GripVerticalIcon className="size-4" />
              </button>
            ) : null}
            <span
              className={cn(
                "size-2.5 shrink-0 self-center rounded-sm",
                stashDotClass(stash.color),
              )}
            />
            <div className="flex min-w-0 flex-1 items-baseline gap-x-2 gap-y-0.5">
              {showStashLink ? (
                <Link
                  href={`/projects/${projectId}/stashes/${stash.id}`}
                  className="shrink-0 font-semibold leading-snug hover:underline"
                >
                  {stash.name}
                </Link>
              ) : (
                <h2 className="shrink-0 font-semibold leading-snug">
                  {stash.name}
                </h2>
              )}
              {stash.description ? (
                <span
                  className="hidden min-w-0 max-w-[15rem] truncate text-sm leading-snug text-muted-foreground sm:max-w-[20rem] md:block lg:max-w-[26rem] xl:max-w-[30rem]"
                  title={stash.description}
                >
                  &mdash; {stash.description}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {editable && (
              <ApiGroupControl projectId={projectId} stashId={stash.id} />
            )}
            {editable ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-sm border-primary/55 bg-transparent px-3 text-primary shadow-none hover:border-primary/75 hover:bg-primary/10 hover:text-primary dark:border-primary/50 dark:bg-transparent dark:hover:border-primary/70 dark:hover:bg-primary/12"
              >
                <Link
                  href={`/projects/${projectId}/endpoints/new?stash=${stash.id}`}
                >
                  <PlusIcon className="size-3.5" />
                  Endpoint
                </Link>
              </Button>
            ) : null}
            {editable ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    ref={actionTrigger}
                    aria-label="Stash actions"
                  >
                    <MoreHorizontalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onFocus={() => { void loadRenameDialog(); }} onPointerEnter={() => { void loadRenameDialog(); }} onSelect={() => setRenaming(true)}>
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditing(true)}>
                      Edit
                    </DropdownMenuItem>
                    <ConfirmDelete
                      title="Delete stash?"
                      description="Endpoints inside this stash will be deleted too."
                      pending={remove.isPending}
                      onConfirm={() => remove.mutate(stash.id)}
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
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={open ? "Collapse stash" : "Expand stash"}
              >
                <ChevronDownIcon
                  className={cn(
                    "transition-transform duration-200",
                    !open && "-rotate-90",
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="stash-panel-body border-t p-4">{endpointBody}</div>
        </CollapsibleContent>
      </Collapsible>
      {renaming && <DeferredDialog returnFocus={actionTrigger} title="Rename" onClose={() => setRenaming(false)}><RenameDialog
        kind="stash"
        projectId={projectId}
        itemId={stash.id}
        name={stash.name}
        open={renaming}
        onOpenChange={setRenaming}
      /></DeferredDialog>}
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
    </section>
  );
}

function EmptyStashState({
  projectId,
  stashId,
}: {
  projectId: string;
  stashId: string;
}) {
  return (
    <div className="empty-stash-panel flex flex-col items-center gap-3 rounded-md border border-dashed border-border/80 px-6 py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <InboxIcon className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">No endpoints in this stash yet.</p>
        <p className="text-xs text-muted-foreground">
          Document your first route to bring this stash to life.
        </p>
      </div>
      <div className="w-full max-w-sm pt-2">
        <Link
          href={`/projects/${projectId}/endpoints/new?stash=${stashId}`}
          className="flex flex-col items-start gap-1 rounded-md border bg-background p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <PlusIcon className="size-4 text-primary" />
            Add manual endpoint
          </span>
          <span className="text-xs text-muted-foreground">
            Define method, path, parameters, and examples.
          </span>
        </Link>
      </div>
    </div>
  );
}

function EndpointLayout({
  mode,
  children,
}: {
  mode: "grid" | "list";
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        mode === "grid"
          ? "grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]"
          : "flex flex-col gap-2"
      }
    >
      {children}
    </div>
  );
}

function EndpointItem({
  projectId,
  endpoint,
  mode,
  editable,
  canReorder,
}: {
  projectId: string;
  endpoint: EndpointSummary;
  mode: "grid" | "list";
  editable: boolean;
  canReorder: boolean;
}) {
  const sortable = useSortable({ id: endpoint.id, disabled: !canReorder });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const router = useRouter();
  const remove = useDeleteEndpoint(projectId);
  const href = `/projects/${projectId}/endpoints/${endpoint.id}`;
  const firstResponse = endpoint.firstResponse;
  const openEndpoint = () => router.push(href);

  return (
    <div ref={sortable.setNodeRef} style={style}>
      {mode === "grid" ? (
        <m.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
          <Card
            role="link"
            tabIndex={0}
            aria-label={`Open ${endpoint.name}`}
            onClick={openEndpoint}
            onKeyDown={(event) => {
              if (
                event.target === event.currentTarget &&
                (event.key === "Enter" || event.key === " ")
              ) {
                event.preventDefault();
                openEndpoint();
              }
            }}
            className="endpoint-grid-card h-full cursor-pointer gap-2 border-border bg-card py-3 shadow-none transition-[border-color,box-shadow] hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <CardHeader className="gap-1.5 px-4 pb-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <MethodBadge method={endpoint.method} />
                  <EndpointVersionBadge version={endpoint.version} />
                </div>
                <div
                  className="flex items-center"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  {canReorder ? (
                    <button
                      type="button"
                      className="text-muted-foreground"
                      {...sortable.attributes}
                      {...sortable.listeners}
                      aria-label={`Reorder ${endpoint.name}`}
                    >
                      <GripVerticalIcon />
                    </button>
                  ) : null}
                  {editable ? (
                    <EndpointMenu
                      projectId={projectId}
                      endpoint={endpoint}
                      onDelete={() => remove.mutate(endpoint.id)}
                      pending={remove.isPending}
                    />
                  ) : null}
                </div>
              </div>
              <CardTitle
                className={cn(
                  "break-words text-base",
                  endpoint.isDeprecated &&
                    "line-through decoration-muted-foreground",
                )}
              >
                {endpoint.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 px-4 pt-0">
              <p className="truncate font-mono text-xs text-muted-foreground">
                {endpoint.path}
              </p>
              <CompactMarkdown
                className="line-clamp-2 leading-5 [&_p]:leading-5"
                content={endpoint.description || "No description"}
              />
              {endpoint.isDeprecated ? (
                <Badge
                  variant="outline"
                  className="w-fit border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                >
                  Deprecated
                </Badge>
              ) : null}
            </CardContent>
          </Card>
        </m.div>
      ) : (
        <div className="group flex flex-wrap items-center gap-2 rounded-md border border-transparent border-b-border bg-card px-3 py-3.5 transition-[background-color,border-color] hover:border-border/50 hover:bg-foreground/[0.035] dark:hover:bg-white/[0.05] sm:flex-nowrap sm:gap-3">
          {canReorder ? (
            <button
              type="button"
              className="text-muted-foreground"
              {...sortable.attributes}
              {...sortable.listeners}
              aria-label={`Reorder ${endpoint.name}`}
            >
              <GripVerticalIcon className="size-4" />
            </button>
          ) : null}
          <MethodBadge method={endpoint.method} className="min-w-14 shrink-0" />
          <EndpointVersionBadge version={endpoint.version} />
          <Link
            href={href}
            className={cn(
              "min-w-0 flex-1 truncate font-mono text-sm font-medium text-foreground/90 transition-colors group-hover:text-foreground hover:text-foreground hover:underline underline-offset-2",
              endpoint.isDeprecated &&
                "line-through decoration-muted-foreground",
            )}
          >
            {endpoint.path}
          </Link>
          <Link
            href={href}
            className="hidden min-w-0 max-w-[30%] truncate text-sm text-muted-foreground lg:block"
          >
            {endpoint.name}
          </Link>
          {endpoint.isDeprecated ? (
            <Badge
              variant="outline"
              className="shrink-0 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            >
              Deprecated
            </Badge>
          ) : null}
          {firstResponse ? (
            <span
              className={cn(
                "hidden shrink-0 items-center gap-1.5 font-mono text-[11px] font-semibold sm:inline-flex",
                statusTextClass(firstResponse.statusCode),
              )}
            >
              {firstResponse.statusCode}
              <span className="max-w-28 truncate font-sans font-normal">
                {firstResponse.description}
              </span>
            </span>
          ) : null}
          {editable ? (
            <EndpointMenu
              projectId={projectId}
              endpoint={endpoint}
              onDelete={() => remove.mutate(endpoint.id)}
              pending={remove.isPending}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function EndpointMenu({
  projectId,
  endpoint,
  onDelete,
  pending,
}: {
  projectId: string;
  endpoint: EndpointSummary;
  onDelete: () => void;
  pending: boolean;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const actionTrigger = useRef<HTMLButtonElement>(null);
  const [moving, setMoving] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" ref={actionTrigger} aria-label="Endpoint actions">
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setRenaming(true)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onFocus={() => { void loadMoveEndpointDialog(); }} onPointerEnter={() => { void loadMoveEndpointDialog(); }} onSelect={() => setMoving(true)}>
              Move to stash…
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                router.push(
                  `/projects/${projectId}/endpoints/${endpoint.id}/edit`,
                )
              }
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                router.push(
                  `/projects/${projectId}/endpoints/new?duplicate=${endpoint.id}`,
                )
              }
            >
              Duplicate endpoint
            </DropdownMenuItem>
            <ConfirmDelete
              title="Delete endpoint?"
              description="This removes the endpoint from the stash."
              pending={pending}
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
      {moving && (
        <DeferredDialog returnFocus={actionTrigger} title="Move endpoint" onClose={() => setMoving(false)}><MoveEndpointDialog
          projectId={projectId}
          endpoint={endpoint}
          onClose={() => setMoving(false)}
        /></DeferredDialog>
      )}
      {renaming && <DeferredDialog returnFocus={actionTrigger} title="Rename" onClose={() => setRenaming(false)}><RenameDialog
        kind="endpoint"
        projectId={projectId}
        itemId={endpoint.id}
        name={endpoint.name}
        open={renaming}
        onOpenChange={setRenaming}
      /></DeferredDialog>}
    </>
  );
}
