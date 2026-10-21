"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { AUTH_SCHEMES, type ProjectAuth, type ProjectSummary } from "@/lib/types";
import { projectKeys } from "@/features/projects/queries";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { authLabels } from "@/lib/auth-labels";

export function ProjectAuthSettings({ project }: { project: ProjectSummary }) {
  const [value, setValue] = useState<ProjectAuth>(project.auth);
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      api<ProjectAuth>(`/api/projects/${project.id}/auth`, {
        method: "PUT",
        body: JSON.stringify(value),
      }),
    onSuccess: (auth) => {
      client.setQueryData<ProjectSummary>(
        projectKeys.summary(project.id),
        (current) => (current ? { ...current, auth } : current),
      );
      toast.success("Authentication documentation saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="lumen-section">
      <header className="mb-5 flex items-start gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-border bg-primary/10 text-primary"
          aria-hidden
        >
          <Shield className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">API authentication</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Document how callers authenticate. Use placeholders in examples; credentials are
            not needed here.
          </p>
        </div>
      </header>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <fieldset
          disabled={project.role !== "owner" || save.isPending}
          className="grid gap-4 disabled:opacity-60"
        >
          <Field>
            <FieldLabel htmlFor="auth-scheme">Scheme</FieldLabel>
            <Select
              value={value.scheme}
              onValueChange={(scheme) =>
                setValue({ ...value, scheme: scheme as ProjectAuth["scheme"] })
              }
            >
              <SelectTrigger id="auth-scheme" className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {AUTH_SCHEMES.map((scheme) => (
                    <SelectItem key={scheme} value={scheme}>
                      {authLabels[scheme]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          {value.scheme === "api_key" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="auth-header-name">Parameter name</FieldLabel>
                <Input
                  id="auth-header-name"
                  required
                  value={value.headerName}
                  onChange={(event) =>
                    setValue({ ...value, headerName: event.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="auth-location">Location</FieldLabel>
                <Select
                  value={value.location}
                  onValueChange={(location) =>
                    setValue({
                      ...value,
                      location: location as ProjectAuth["location"],
                    })
                  }
                >
                  <SelectTrigger id="auth-location" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="header">Header</SelectItem>
                      <SelectItem value="query">Query parameter</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="auth-instructions">Instructions</FieldLabel>
            <Textarea
              id="auth-instructions"
              value={value.description}
              maxLength={2000}
              rows={5}
              onChange={(event) =>
                setValue({ ...value, description: event.target.value })
              }
              placeholder="Where to obtain a token, required scopes, and admin requirements."
            />
          </Field>
          {project.role === "owner" && (
            <Button type="submit" size="sm" className="w-fit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save authentication"}
            </Button>
          )}
        </fieldset>
      </form>
    </section>
  );
}
