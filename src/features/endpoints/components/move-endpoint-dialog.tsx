"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { EndpointRecord } from "@/lib/types";
import { useProject } from "@/features/projects/queries";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

export function MoveEndpointDialog({ projectId, endpoint, onClose }: {
  projectId: string;
  endpoint: EndpointRecord;
  onClose: () => void;
}) {
  const project = useProject(projectId);
  const client = useQueryClient();
  const [destination, setDestination] = useState("");
  const destinations = project.data?.stashes.filter(stash => stash.id !== endpoint.stashId) ?? [];
  const move = useMutation({
    mutationFn: () => api<EndpointRecord>(`/api/projects/${projectId}/endpoints/${endpoint.id}`, {
      method: "PATCH", body: JSON.stringify({ stashId: destination }),
    }),
    onSuccess: async (saved) => {
      if (project.data) client.setQueryData(["endpoints", projectId, endpoint.id], { endpoint: saved, role: project.data.role });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["projects"] }),
        client.invalidateQueries({ queryKey: ["endpoints", projectId, endpoint.id] }),
        client.invalidateQueries({ queryKey: ["search"] }),
      ]);
      toast.success("Endpoint moved");
      onClose();
    },
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !move.isPending) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move endpoint</DialogTitle>
          <DialogDescription>Move “{endpoint.name}” to another stash in this project. Its link and documentation stay the same.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={(event) => {
          event.preventDefault();
          if (!move.isPending && destinations.some(stash => stash.id === destination)) move.mutate();
        }}>
          {destinations.length ? <div className="grid gap-2">
            <Label htmlFor="move-destination">Destination stash</Label>
            <Select value={destination} onValueChange={(value) => { setDestination(value); move.reset(); }} disabled={move.isPending}>
              <SelectTrigger id="move-destination" className="w-full"><SelectValue placeholder="Choose a stash" /></SelectTrigger>
              <SelectContent>{destinations.map(stash => <SelectItem key={stash.id} value={stash.id}>{stash.name}</SelectItem>)}</SelectContent>
            </Select>
          </div> : <p className="text-sm text-muted-foreground">Create another stash in this project before moving this endpoint.</p>}
          {move.isError && <p role="alert" className="text-sm text-destructive">{move.error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={move.isPending} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={move.isPending || !destinations.some(stash => stash.id === destination)}>{move.isPending && <Spinner />}Move endpoint</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
