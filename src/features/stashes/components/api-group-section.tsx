"use client";

import { useId, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon, FolderIcon, MoreHorizontalIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { ApiGroupRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDelete } from "@/components/confirm-delete";

export function ApiGroupControl({ projectId, stashId, group }: {
  projectId: string; stashId: string; group?: ApiGroupRecord;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const id = useId();
  const client = useQueryClient();
  const path = `/api/projects/${projectId}/stashes/${stashId}/groups${group ? `/${group.id}` : ""}`;
  const mutation = useMutation({
    mutationFn: (action: "save" | "delete") => api(path, {
      method: action === "delete" ? "DELETE" : group ? "PATCH" : "POST",
      ...(action === "save" ? { body: JSON.stringify({ name: name.trim() }) } : {}),
    }),
    onSuccess: async (_, action) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["projects"] }),
        client.invalidateQueries({ queryKey: ["endpoints", projectId] }),
      ]);
      toast.success(action === "delete" ? "Group deleted. Endpoints are now ungrouped." : group ? "API group renamed" : "API group created");
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  function edit() { setName(group?.name ?? ""); mutation.reset(); setOpen(true); }
  return <>
    {group ? <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${group.name}`}><MoreHorizontalIcon /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end"><DropdownMenuGroup>
        <DropdownMenuItem onSelect={edit}>Rename group</DropdownMenuItem>
        <ConfirmDelete title="Delete API group?" description="Endpoints in this group will move to Ungrouped APIs. Their documentation will be kept."
          pending={mutation.isPending} onConfirm={() => mutation.mutate("delete")}
          trigger={<DropdownMenuItem variant="destructive" onSelect={event => event.preventDefault()}>Delete group</DropdownMenuItem>} />
      </DropdownMenuGroup></DropdownMenuContent>
    </DropdownMenu> : <Button variant="outline" size="sm" onClick={edit}><PlusIcon className="size-4 text-primary" />API group</Button>}
    <Dialog open={open} onOpenChange={value => { if (!mutation.isPending) setOpen(value); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{group ? "Rename API group" : "Create API group"}</DialogTitle>
          <DialogDescription>Organize related endpoints within this stash. Grouping is optional.</DialogDescription></DialogHeader>
        <form className="grid gap-5" onSubmit={event => { event.preventDefault(); if (name.trim() && !mutation.isPending) mutation.mutate("save"); }}>
          <div className="grid gap-2"><Label htmlFor={id}>Group name</Label>
            <Input id={id} autoFocus required maxLength={80} placeholder="Email Authentication" value={name} onChange={event => setName(event.target.value)} disabled={mutation.isPending} /></div>
          {mutation.isError && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
          <DialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || mutation.isPending}>{mutation.isPending ? "Saving…" : group ? "Save name" : "Create group"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}

export function ApiGroupSection({ id, name, count, actions, children, filtering }: {
  id?: string; name: string; count: number; actions?: ReactNode; children: ReactNode; filtering: boolean;
}) {
  const [open, setOpen] = useState(true);
  return <Collapsible id={id} open={filtering || open} onOpenChange={setOpen} className="min-w-0 scroll-mt-20 rounded-2xl border bg-muted/15">
    <div className="flex items-center gap-2 px-3 py-2">
      <CollapsibleTrigger asChild>
        <button type="button" className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 text-left transition-colors hover:bg-muted/60 active:bg-muted focus-visible:outline-2 focus-visible:outline-ring" aria-label={`${open || filtering ? "Collapse" : "Expand"} ${name}`}>
          <ChevronDownIcon className={`size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${open || filtering ? "" : "-rotate-90"}`} />
          <FolderIcon className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 break-words text-sm font-semibold">{name}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">{count}</span>
        </button>
      </CollapsibleTrigger>
      {actions}
    </div>
    <CollapsibleContent><div className="border-t p-3 sm:p-4">{children}</div></CollapsibleContent>
  </Collapsible>;
}
