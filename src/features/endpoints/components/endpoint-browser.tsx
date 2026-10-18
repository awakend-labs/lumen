"use client";

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
import { motion } from "framer-motion";
import {
  ChevronDownIcon,
  GripVerticalIcon,
  InboxIcon,
  LayoutGridIcon,
  ListIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDelete } from "@/components/confirm-delete";
import { MethodBadge, statusClass } from "@/components/method-badge";
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
import { useDeleteEndpoint, useReorderEndpoints } from "@/features/endpoints/queries";
import { StashDialog } from "@/features/stashes/components/stash-dialog";
import {
  useDeleteStash,
  useReorderStashes,
  useUpdateStash,
} from "@/features/stashes/queries";
import { useViewMode } from "@/hooks/use-view-mode";
import { stashDotClass } from "@/lib/format";
import {
  STASH_STATUS_CLASS,
  STASH_STATUS_LABEL,
} from "@/features/stashes/components/stash-status-control";
import { canEditContent } from "@/lib/permissions";
import type { EndpointRecord, ProjectDetail, StashRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

type VisibleStash = { stash: StashRecord; endpoints: EndpointRecord[] };

export function EndpointBrowser({
  project,
  stashId,
  onCreateStash,
}: {
  project: ProjectDetail;
  stashId?: string;
  onCreateStash?: () => void;
}) {
  const [mode, setMode] = useViewMode();
  const [query, setQuery] = useState("");
  const editable = canEditContent(project.role);
  const reorder = useReorderStashes(project.id);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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
          endpoints: stash.endpoints.filter((endpoint) => matchesEndpoint(endpoint, normalized)),
        },
      ];
    }
    const stashMatch = stash.name.toLowerCase().includes(normalized);
    const endpoints = stash.endpoints.filter(
      (endpoint) => stashMatch || matchesEndpoint(endpoint, normalized),
    );
    return stashMatch || endpoints.length > 0 ? [{ stash, endpoints }] : [];
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
          <EmptyTitle>{stashId ? "Stash not found" : "No stashes yet"}</EmptyTitle>
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
            placeholder={stashId ? "Filter endpoints..." : "Filter stashes or routes..."}
            aria-label={stashId ? "Filter endpoints" : "Filter stashes or routes"}
            className="h-9 bg-background pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">View</span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={mode}
            onValueChange={(value) => {
              if (value === "grid" || value === "list") setMode(value);
            }}
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
            <EmptyDescription>Nothing matches &ldquo;{query.trim()}&rdquo;.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => setQuery("")}>
              Clear filter
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
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
          className="group flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/35 bg-linear-to-br from-primary/10 via-background to-muted/30 px-6 py-8 text-center shadow-sm transition-all hover:border-primary/50 hover:from-primary/15 hover:shadow-md"
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <PlusIcon className="size-5" />
          </span>
          <span className="text-sm font-medium">Create another stash</span>
          <span className="text-xs text-muted-foreground">
            Group endpoints into logical resources like auth, users, or webhooks.
          </span>
        </button>
      ) : null}
    </div>
  );
}

function matchesEndpoint(endpoint: EndpointRecord, q: string) {
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
  mode,
  showStashLink,
  bare = false,
}: {
  projectId: string;
  stash: StashRecord;
  endpoints: EndpointRecord[];
  editable: boolean;
  canReorder: boolean;
  filtering: boolean;
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
  const update = useUpdateStash(projectId);
  const remove = useDeleteStash(projectId);
  const reorderEndpoints = useReorderEndpoints(projectId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = stash.endpoints.map((endpoint) => endpoint.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    reorderEndpoints.mutate({ stashId: stash.id, ids: arrayMove(ids, oldIndex, newIndex) });
  }

  const endpointNodes = endpoints.map((endpoint) => (
    <EndpointItem
      key={endpoint.id}
      projectId={projectId}
      endpoint={endpoint}
      mode={mode}
      editable={editable}
      canReorder={canReorder}
    />
  ));

  const endpointBody =
    endpoints.length === 0 ? (
      filtering ? (
        <p className="text-sm text-muted-foreground">No matching endpoints in this stash.</p>
      ) : editable ? (
        <EmptyStashState projectId={projectId} stashId={stash.id} />
      ) : (
        <p className="text-sm text-muted-foreground">No endpoints in this stash yet.</p>
      )
    ) : canReorder ? (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={endpoints.map((endpoint) => endpoint.id)}
          strategy={verticalListSortingStrategy}
        >
          <EndpointLayout mode={mode}>{endpointNodes}</EndpointLayout>
        </SortableContext>
      </DndContext>
    ) : (
      <EndpointLayout mode={mode}>{endpointNodes}</EndpointLayout>
    );

  if (bare) {
    return endpointBody;
  }

  return (
    <section
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm",
        sortable.isDragging && "shadow-lg ring-2 ring-primary/40",
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {canReorder && showStashLink ? (
              <button
                type="button"
                className="text-muted-foreground"
                aria-label="Reorder stash"
                {...sortable.attributes}
                {...sortable.listeners}
              >
                <GripVerticalIcon className="size-4" />
              </button>
            ) : null}
            <span className={cn("size-2.5 shrink-0 rounded-full", stashDotClass(stash.color))} />
            {showStashLink ? (
              <Link
                href={`/projects/${projectId}/stashes/${stash.id}`}
                className="truncate font-semibold hover:underline"
              >
                {stash.name}
              </Link>
            ) : (
              <h2 className="truncate font-semibold">{stash.name}</h2>
            )}
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
              {endpoints.length}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                STASH_STATUS_CLASS[stash.status],
              )}
            >
              {STASH_STATUS_LABEL[stash.status]}
            </span>
            {stash.description ? (
              <span className="hidden truncate text-sm text-muted-foreground md:block">
                &mdash; {stash.description}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {editable ? (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 rounded-full border-primary/35 bg-primary/10 px-3 text-foreground shadow-none hover:border-primary/50 hover:bg-primary/15"
              >
                <Link href={`/projects/${projectId}/endpoints/new?stash=${stash.id}`}>
                  <PlusIcon className="size-3.5 text-primary" />
                  Endpoint
                </Link>
              </Button>
            ) : null}
            {editable ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Stash actions">
                    <MoreHorizontalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => setEditing(true)}>Edit</DropdownMenuItem>
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
                  className={cn("transition-transform duration-200", !open && "-rotate-90")}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="border-t p-4">{endpointBody}</div>
        </CollapsibleContent>
      </Collapsible>
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

function EmptyStashState({ projectId, stashId }: { projectId: string; stashId: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/20 px-6 py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <InboxIcon className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">No endpoints in this stash yet.</p>
        <p className="text-xs text-muted-foreground">
          Get started by defining an endpoint or importing your API schema.
        </p>
      </div>
      <div className="grid w-full max-w-xl gap-3 pt-2 sm:grid-cols-2">
        <Link
          href={`/projects/${projectId}/endpoints/new?stash=${stashId}`}
          className="flex flex-col items-start gap-1 rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <PlusIcon className="size-4 text-primary" />
            Add manual endpoint
          </span>
          <span className="text-xs text-muted-foreground">
            Define method, path, parameters, and examples.
          </span>
        </Link>
        <div
          aria-disabled="true"
          className="flex flex-col items-start gap-1 rounded-lg border bg-background p-3 text-left opacity-70"
        >
          <span className="flex w-full items-center gap-2 text-sm font-medium">
            <UploadIcon className="size-4 text-muted-foreground" />
            Import cURL or OpenAPI
            <Badge variant="secondary" className="ml-auto">
              Soon
            </Badge>
          </span>
          <span className="text-xs text-muted-foreground">Paste a cURL command or JSON spec.</span>
        </div>
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
    <div className={mode === "grid" ? "grid gap-3 md:grid-cols-2" : "flex flex-col gap-2"}>
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
  endpoint: EndpointRecord;
  mode: "grid" | "list";
  editable: boolean;
  canReorder: boolean;
}) {
  const sortable = useSortable({ id: endpoint.id, disabled: !canReorder });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const remove = useDeleteEndpoint(projectId);
  const href = `/projects/${projectId}/endpoints/${endpoint.id}`;
  const firstResponse = endpoint.responses[0];

  return (
    <div ref={sortable.setNodeRef} style={style}>
      {mode === "grid" ? (
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
          <Card
            className="h-full border-border/60 bg-linear-to-br from-muted/30 via-card to-background shadow-sm transition-shadow hover:shadow-md"
          >
            <CardHeader className="gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <MethodBadge method={endpoint.method} />
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {endpoint.version}
                  </span>
                </div>
                <div className="flex items-center">
                  {canReorder ? (
                    <button
                      type="button"
                      aria-label="Reorder endpoint"
                      className="text-muted-foreground"
                      {...sortable.attributes}
                      {...sortable.listeners}
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
              <CardTitle className="text-base">
                <Link href={href} className="hover:underline">
                  {endpoint.name}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="truncate font-mono text-xs text-muted-foreground">{endpoint.path}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {endpoint.description || "No description"}
              </p>
              {endpoint.isDeprecated ? <Badge variant="outline">Deprecated</Badge> : null}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="group flex items-center gap-3 rounded-lg border border-border/60 bg-linear-to-br from-muted/25 via-background to-muted/10 px-3 py-2.5 shadow-sm transition-colors hover:border-foreground/15 hover:bg-muted/40">
          {canReorder ? (
            <button
              type="button"
              aria-label="Reorder endpoint"
              className="text-muted-foreground"
              {...sortable.attributes}
              {...sortable.listeners}
            >
              <GripVerticalIcon className="size-4" />
            </button>
          ) : null}
          <MethodBadge method={endpoint.method} className="min-w-14 shrink-0" />
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {endpoint.version}
          </span>
          <Link
            href={href}
            className="min-w-0 flex-1 truncate font-mono text-sm hover:underline"
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
            <Badge variant="outline" className="shrink-0">
              Deprecated
            </Badge>
          ) : null}
          {firstResponse ? (
            <span
              className={cn(
                "hidden shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold sm:inline-flex",
                statusClass(firstResponse.statusCode),
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
  endpoint: EndpointRecord;
  onDelete: () => void;
  pending: boolean;
}) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Endpoint actions">
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={() =>
              router.push(`/projects/${projectId}/endpoints/${endpoint.id}/edit`)
            }
          >
            Edit
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
  );
}
