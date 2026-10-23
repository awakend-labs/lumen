"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { EndpointRecord } from "@/lib/types";
import { projectKeys, useProject } from "@/features/projects/queries";
import { endpointKeys } from "@/features/endpoints/queries";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

const ungrouped = "ungrouped";

export function MoveEndpointGroupDialog({ projectId, endpoint, onClose }: {
  projectId: string;
  endpoint: Pick<EndpointRecord, "id" | "name" | "stashId" | "groupId" | "updatedAt">;
  onClose: () => void;
}) {
  const project = useProject(projectId);
  const client = useQueryClient();
  const [destination, setDestination] = useState("");
  const groups = project.data?.stashes.find(stash => stash.id === endpoint.stashId)?.groups ?? [];
  const destinations = [
    ...groups.map(group => ({ id: group.id, name: group.name })),
    { id: ungrouped, name: "Ungrouped APIs" },
  ].filter(group => group.id !== (endpoint.groupId ?? ungrouped));
  const canMove = Boolean(project.data) && destinations.some(group => group.id === destination);
  const move = useMutation({
    mutationFn: () => api<EndpointRecord>(`/api/projects/${projectId}/endpoints/${endpoint.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        stashId: endpoint.stashId,
        groupId: destination === ungrouped ? null : destination,
        expectedUpdatedAt: endpoint.updatedAt,
      }),
    }),
    onSuccess: async (saved) => {
      await client.cancelQueries({ queryKey: endpointKeys.detail(projectId, endpoint.id), exact: true });
      if (project.data) client.setQueryData(endpointKeys.detail(projectId, endpoint.id), { endpoint: saved, role: project.data.role });
      await Promise.all([
        client.invalidateQueries({ queryKey: projectKeys.all, exact: true }),
        client.invalidateQueries({ queryKey: projectKeys.summary(projectId), exact: true }),
        client.invalidateQueries({ queryKey: endpointKeys.detail(projectId, endpoint.id), exact: true }),
        client.invalidateQueries({ queryKey: ["search"] }),
      ]);
      toast.success("Endpoint moved");
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={open => { if (!open && !move.isPending) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to API group</DialogTitle>
          <DialogDescription>Move “{endpoint.name}” to another API group in this stash.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={event => {
          event.preventDefault();
          if (!move.isPending && canMove) move.mutate();
        }}>
          {project.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading API groups…</p>
            : project.isError ? <p role="alert" className="text-sm text-destructive">{project.error.message}</p>
            : destinations.length ? <div className="grid gap-2">
              <Label htmlFor="move-group-destination">Destination API group</Label>
              <Select value={destination} onValueChange={value => { setDestination(value); move.reset(); }} disabled={move.isPending}>
                <SelectTrigger id="move-group-destination" className="w-full"><SelectValue placeholder="Choose an API group" /></SelectTrigger>
                <SelectContent>{destinations.map(group => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}</SelectContent>
              </Select>
            </div> : <p className="text-sm text-muted-foreground">Create an API group in this stash before moving this endpoint.</p>}
          {move.isError && <p role="alert" className="text-sm text-destructive">{move.error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={move.isPending} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={move.isPending || !canMove}>{move.isPending && <Spinner />}Move endpoint</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
