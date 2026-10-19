"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { AUTH_SCHEMES, type ProjectAuth, type ProjectDetail } from "@/lib/types";
import { projectKeys } from "@/features/projects/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const authLabels = { none: "Not configured", bearer: "Bearer / JWT", api_key: "API key", basic: "Basic" };

export function ProjectAuthSettings({ project }: { project: ProjectDetail; }) {
  const [value, setValue] = useState<ProjectAuth>(project.auth);
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: () => api<ProjectAuth>(`/api/projects/${project.id}/auth`, { method: "PUT", body: JSON.stringify(value) }),
    onSuccess: (auth) => {
      client.setQueryData<ProjectDetail>(projectKeys.detail(project.id), current => current ? { ...current, auth } : current);
      toast.success("Authentication documentation saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return <section className="lumen-section">
    <h2 className="mb-2 flex items-center gap-2 font-semibold">
      <Shield className="size-4 text-muted-foreground" /> API authentication</h2>
    <p className="mb-4 text-sm text-muted-foreground">Document how callers authenticate. Use placeholders in examples; credentials are not needed here.</p>
    <form className="grid gap-4" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
      <fieldset disabled={project.role !== "owner" || save.isPending} className="grid gap-4 disabled:opacity-60">
        <label className="grid gap-2 text-sm">Scheme
          <select className="h-11 rounded-md border border-input bg-card px-3" value={value.scheme} onChange={event => setValue({ ...value, scheme: event.target.value as ProjectAuth["scheme"] })}>
            {AUTH_SCHEMES.map(scheme => <option key={scheme} value={scheme}>{authLabels[scheme]}</option>)}
          </select>
        </label>
        {value.scheme === "api_key" && <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm">Parameter name<Input required value={value.headerName} onChange={event => setValue({ ...value, headerName: event.target.value })} />
          </label>
          <label className="grid gap-2 text-sm">Location<select className="h-11 rounded-md border border-input bg-card px-3" value={value.location} onChange={event => setValue({ ...value, location: event.target.value as ProjectAuth["location"] })}>
            <option value="header">Header</option>
            <option value="query">Query parameter</option>
          </select>
          </label>
        </div>}
        <label className="grid gap-2 text-sm">Instructions<Textarea value={value.description} maxLength={2000} onChange={event => setValue({ ...value, description: event.target.value })} placeholder="Where to obtain a token, required scopes, and admin requirements." />
        </label>
        {project.role === "owner" && <Button type="submit" className="w-fit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save authentication"}</Button>}
      </fieldset>
    </form>
  </section>;
}
