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
  GripVerticalIcon,
  LayoutGridIcon,
  ListIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDelete } from "@/components/confirm-delete";
import { MethodBadge } from "@/components/method-badge";
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
import { canEditContent } from "@/lib/permissions";
import type { EndpointRecord, ProjectDetail, StashRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EndpointBrowser({
  project,
  stashId,
}: {
  project: ProjectDetail;
  stashId?: string;
}) {
  const [mode, setMode] = useViewMode();
  const editable = canEditContent(project.role);
  const reorder = useReorderStashes(project.id);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const stashes = stashId
    ? project.stashes.filter((stash) => stash.id === stashId)
    : project.stashes;

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = stashes.map((stash) => stash.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    reorder.mutate(arrayMove(ids, oldIndex, newIndex));
  }

  if (stashes.length === 0) {
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
        {!stashId ? (
          <EmptyContent>
            <Button asChild>
              <Link href={`/projects/${project.id}`}>Back to project</Link>
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  const sections = stashes.map((stash) => (
    <StashSection
      key={stash.id}
      projectId={project.id}
      stash={stash}
      editable={editable}
      mode={mode}
      showStashLink={!stashId}
    />
  ));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
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
      {editable && !stashId ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={stashes.map((stash) => stash.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-6">{sections}</div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex flex-col gap-6">{sections}</div>
      )}
    </div>
  );
}

function StashSection({
  projectId,
  stash,
  editable,
  mode,
  showStashLink,
}: {
  projectId: string;
  stash: StashRecord;
  editable: boolean;
  mode: "grid" | "list";
  showStashLink: boolean;
}) {
  const sortable = useSortable({ id: stash.id, disabled: !showStashLink || !editable });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const [editing, setEditing] = useState(false);
  const update = useUpdateStash(projectId);
  const remove = useDeleteStash(projectId);
  const reorder = useReorderEndpoints(projectId);
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
    reorder.mutate({ stashId: stash.id, ids: arrayMove(ids, oldIndex, newIndex) });
  }

  const endpointNodes = stash.endpoints.map((endpoint) => (
    <EndpointItem
      key={endpoint.id}
      projectId={projectId}
      endpoint={endpoint}
      mode={mode}
      editable={editable}
    />
  ));

  return (
    <section
      ref={sortable.setNodeRef}
      style={style}
      className={cn("rounded-xl border bg-card", sortable.isDragging && "shadow-lg")}
    >
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-start gap-2">
          {editable && showStashLink ? (
            <button
              type="button"
              className="mt-0.5 text-muted-foreground"
              aria-label="Reorder stash"
              {...sortable.attributes}
              {...sortable.listeners}
            >
              <GripVerticalIcon />
            </button>
          ) : null}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-full", stashDotClass(stash.color))} />
              {showStashLink ? (
                <Link
                  href={`/projects/${projectId}/stashes/${stash.id}`}
                  className="truncate font-medium hover:underline"
                >
                  {stash.name}
                </Link>
              ) : (
                <h2 className="truncate font-medium">{stash.name}</h2>
              )}
              <span className="text-xs text-muted-foreground">
                {stash.endpoints.length}
              </span>
            </div>
            {stash.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{stash.description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {editable ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/projects/${projectId}/endpoints/new?stash=${stash.id}`}>
                <PlusIcon data-icon="inline-start" />
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
        </div>
      </div>
      <div className="p-4">
        {stash.endpoints.length === 0 ? (
          <p className="text-sm text-muted-foreground">No endpoints in this stash yet.</p>
        ) : editable ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={stash.endpoints.map((endpoint) => endpoint.id)}
              strategy={verticalListSortingStrategy}
            >
              <EndpointLayout mode={mode}>{endpointNodes}</EndpointLayout>
            </SortableContext>
          </DndContext>
        ) : (
          <EndpointLayout mode={mode}>{endpointNodes}</EndpointLayout>
        )}
      </div>
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
}: {
  projectId: string;
  endpoint: EndpointRecord;
  mode: "grid" | "list";
  editable: boolean;
}) {
  const sortable = useSortable({ id: endpoint.id, disabled: !editable });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const remove = useDeleteEndpoint(projectId);
  const href = `/projects/${projectId}/endpoints/${endpoint.id}`;

  return (
    <div ref={sortable.setNodeRef} style={style}>
      {mode === "grid" ? (
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
          <Card className="h-full">
            <CardHeader className="gap-3">
              <div className="flex items-center justify-between gap-2">
                <MethodBadge method={endpoint.method} />
                <div className="flex items-center">
                  {editable ? (
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
        <Collapsible className="rounded-lg border">
          <div className="flex items-center gap-2 px-3 py-2">
            {editable ? (
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
            <MethodBadge method={endpoint.method} />
            <Link href={href} className="min-w-0 flex-1 truncate font-mono text-sm">
              {endpoint.path}
            </Link>
            <span className="hidden truncate text-sm text-muted-foreground sm:block sm:max-w-48">
              {endpoint.name}
            </span>
            {endpoint.isDeprecated ? <Badge variant="outline">Deprecated</Badge> : null}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                Details
              </Button>
            </CollapsibleTrigger>
            {editable ? (
              <EndpointMenu
                projectId={projectId}
                endpoint={endpoint}
                onDelete={() => remove.mutate(endpoint.id)}
                pending={remove.isPending}
              />
            ) : null}
          </div>
          <CollapsibleContent className="border-t px-3 py-3 text-sm text-muted-foreground">
            <p>{endpoint.description || "No description"}</p>
            <Button asChild variant="link" className="px-0">
              <Link href={href}>Open full documentation</Link>
            </Button>
          </CollapsibleContent>
        </Collapsible>
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
