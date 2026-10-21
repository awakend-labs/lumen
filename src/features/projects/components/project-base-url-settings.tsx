"use client";

import { useEffect, useState } from "react";
import { GlobeIcon } from "lucide-react";
import { useUpdateProject } from "@/features/projects/queries";
import type { ProjectSummary } from "@/lib/types";
import { baseUrlSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ProjectBaseUrlSettings({ project }: { project: ProjectSummary }) {
  const [baseUrl, setBaseUrl] = useState(project.baseUrl);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateProject(project.id);
  const canEdit = project.role === "owner";

  useEffect(() => {
    setBaseUrl(project.baseUrl);
  }, [project.baseUrl]);

  function save(event: React.FormEvent) {
    event.preventDefault();
    const parsed = baseUrlSchema.safeParse(baseUrl);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid base URL");
      return;
    }
    setError(null);
    update.mutate({
      name: project.name,
      description: project.description ?? "",
      status: project.status,
      baseUrl: parsed.data,
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
            New endpoints start with this URL. Each endpoint can use its own.
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
            <Button type="submit" size="sm" className="w-fit" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save base URL"}
            </Button>
          ) : null}
        </fieldset>
      </form>
    </section>
  );
}
