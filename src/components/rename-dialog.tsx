"use client";

import { useEffect, useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function RenameDialog({ kind, projectId, itemId, name, open, onOpenChange }: {
  kind: "project" | "stash" | "endpoint";
  projectId: string;
  itemId?: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const inputId = useId();
  const [draft, setDraft] = useState(name);
  const client = useQueryClient();
  const maxLength = kind === "endpoint" ? 120 : 80;
  const title = `Rename ${kind}`;
  const rename = useMutation({
    mutationFn: (nextName: string) => {
      const path = kind === "project"
        ? `/api/projects/${projectId}`
        : `/api/projects/${projectId}/${kind === "stash" ? "stashes" : "endpoints"}/${itemId}`;
      return api(path, { method: "PATCH", body: JSON.stringify({ name: nextName }) });
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["projects"], exact: true }),
        client.invalidateQueries({ queryKey: ["project-summary", projectId], exact: true }),
        ...(kind === "endpoint" ? [client.invalidateQueries({ queryKey: ["endpoints", projectId, itemId], exact: true })] : []),
        client.invalidateQueries({ queryKey: ["search"] }),
      ]);
      toast.success(`${kind[0].toUpperCase()}${kind.slice(1)} renamed`);
      onOpenChange(false);
    },
  });
  const reset = rename.reset;
  useEffect(() => {
    if (open) { setDraft(name); reset(); }
  }, [open, name, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!rename.isPending) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Choose a new name. Existing links and documentation stay the same.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={(event) => {
          event.preventDefault();
          if (!rename.isPending && draft.trim() && draft.trim() !== name) rename.mutate(draft.trim());
        }}>
          <div className="grid gap-2">
            <Label htmlFor={inputId}>Name</Label>
            <Input id={inputId} autoFocus required maxLength={maxLength} value={draft}
              disabled={rename.isPending} onFocus={(event) => event.target.select()}
              onChange={(event) => { setDraft(event.target.value); if (rename.isError) reset(); }}
              aria-invalid={rename.isError} aria-describedby={rename.isError ? `${inputId}-error` : undefined} />
            {rename.isError && <p id={`${inputId}-error`} role="alert" className="text-sm text-destructive">{rename.error.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={rename.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={rename.isPending || !draft.trim() || draft.trim() === name}>
              {rename.isPending && <Spinner />}
              Save name
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
