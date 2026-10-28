"use client";

import { useRef, useState } from "react";
import { ArrowRightIcon, FolderIcon, GlobeIcon } from "lucide-react";
import { useUpdateProjectBaseUrl } from "@/features/projects/queries";
import type { ProjectSummary } from "@/lib/types";
import { baseUrlSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { stashDotClass } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ProjectBaseUrlSettings({ project }: { project: ProjectSummary }) {
  const [baseUrl, setBaseUrl] = useState(project.baseUrl);
  const [previousBaseUrl, setPreviousBaseUrl] = useState(project.baseUrl);
  const [error, setError] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const saveButton = useRef<HTMLButtonElement>(null);
  const update = useUpdateProjectBaseUrl(project.id);
  const canEdit = project.role === "owner";
  const selectedStashes = project.stashes.filter(stash => selectedIds.has(stash.id));
  const endpointCount = selectedStashes.reduce((total, stash) => total + stash.endpoints.length, 0);
  const allSelected = project.stashes.length > 0 && selectedStashes.length === project.stashes.length;

  if (previousBaseUrl !== project.baseUrl) {
    setPreviousBaseUrl(project.baseUrl);
    setBaseUrl(project.baseUrl);
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit || update.isPending) return;
    const parsed = baseUrlSchema.safeParse(baseUrl);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid base URL");
      return;
    }
    setError(null);
    update.reset();
    setSelectedIds(new Set(project.stashes.map(stash => stash.id)));
    setPendingUrl(parsed.data);
  }

  function confirmUpdate() {
    if (pendingUrl === null || !canEdit || update.isPending) return;
    update.mutate({ baseUrl: pendingUrl, stashIds: selectedStashes.map(stash => stash.id) }, {
      onSuccess: () => setPendingUrl(null),
    });
  }

  return (
    <section className="lumen-section">
      <header className="mb-5 flex items-start gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-border bg-primary/10 text-primary"
          aria-hidden
        >
          <GlobeIcon className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">Base URL</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Update endpoints in selected stashes at once. Each endpoint can still use its own URL.
          </p>
        </div>
      </header>
      <form className="grid gap-4" onSubmit={save}>
        <fieldset
          disabled={!canEdit || update.isPending}
          className="grid gap-4 disabled:opacity-60"
        >
          <Field data-invalid={Boolean(error) || undefined}>
            <FieldLabel htmlFor="project-settings-base-url">Project base URL</FieldLabel>
            <Input
              id="project-settings-base-url"
              value={baseUrl}
              maxLength={2000}
              placeholder="https://api.example.com/v1"
              aria-invalid={Boolean(error)}
              onChange={(event) => {
                setBaseUrl(event.target.value);
                if (error) setError(null);
              }}
            />
            <FieldError>{error}</FieldError>
          </Field>
          {canEdit ? (
            <Button ref={saveButton} type="submit" size="sm" className="w-fit" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save base URL"}
            </Button>
          ) : null}
        </fieldset>
      </form>
      <Dialog open={pendingUrl !== null} onOpenChange={open => { if (!open && !update.isPending) setPendingUrl(null); }}>
        <DialogContent className="max-h-[90dvh] gap-5 overflow-y-auto sm:max-w-lg" showCloseButton={!update.isPending}
          onCloseAutoFocus={event => { event.preventDefault(); saveButton.current?.focus(); }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <GlobeIcon className="size-5 text-primary" aria-hidden />Update base URL
            </DialogTitle>
            <DialogDescription>
              Choose which stashes should use the new URL. All endpoints in selected stashes will be updated, including custom base URLs.
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-w-0 gap-2 rounded-md border border-border bg-muted/30 px-3 py-3 text-xs">
            <span className="break-all text-muted-foreground">{project.baseUrl || "No base URL"}</span>
            <div className="flex min-w-0 items-start gap-2">
              <ArrowRightIcon className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 break-all font-mono text-foreground">{pendingUrl || "No base URL (relative paths)"}</span>
            </div>
          </div>
          {project.stashes.length ? <fieldset disabled={update.isPending} className="min-w-0">
            <legend className="sr-only">Stashes to update</legend>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Checkbox aria-label="Select all stashes" checked={allSelected ? true : selectedStashes.length ? "indeterminate" : false}
                  onCheckedChange={checked => setSelectedIds(new Set(checked === true ? project.stashes.map(stash => stash.id) : []))} />
                Select all
              </label>
              <span className="text-xs text-muted-foreground" aria-live="polite">{selectedStashes.length} of {project.stashes.length} selected</span>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto overscroll-contain p-1 -m-1 [scrollbar-width:thin]">
              {project.stashes.map(stash => <label key={stash.id} className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 transition-colors focus-within:ring-2 focus-within:ring-ring/50",
                selectedIds.has(stash.id) ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/50",
              )}>
                <Checkbox aria-label={`Update ${stash.name}`} checked={selectedIds.has(stash.id)}
                  onCheckedChange={checked => setSelectedIds(current => {
                    const next = new Set(current);
                    if (checked === true) next.add(stash.id); else next.delete(stash.id);
                    return next;
                  })} />
                <span className="relative flex size-8 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground" aria-hidden>
                  <FolderIcon className="size-4" />
                  <span className={cn("absolute right-0.5 bottom-0.5 size-1.5 rounded-sm", stashDotClass(stash.color))} />
                </span>
                <span className="min-w-0 flex-1 break-words text-sm font-medium">{stash.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{stash.endpoints.length} endpoint{stash.endpoints.length === 1 ? "" : "s"}</span>
              </label>)}
            </div>
          </fieldset> : <p className="text-sm text-muted-foreground">No stashes yet. The new URL will be used when you create endpoints.</p>}
          <div className="space-y-1 text-xs leading-relaxed text-muted-foreground" aria-live="polite">
            <p>{endpointCount ? `${endpointCount} endpoint${endpointCount === 1 ? "" : "s"} will be updated.` : "Only the project default will change."} Unselected stashes keep their current URLs.</p>
            <p>You can change any endpoint&apos;s base URL individually afterward.</p>
          </div>
          {update.isError && <p role="alert" className="text-sm text-destructive">{update.error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={update.isPending} onClick={() => setPendingUrl(null)}>Cancel</Button>
            <Button type="button" disabled={!canEdit || update.isPending} onClick={confirmUpdate}>{update.isPending ? "Updating…" : "Update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
