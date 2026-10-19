"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectStatus } from "@/lib/types";
import { projectInputSchema, type ProjectInput } from "@/lib/validators";

export function ProjectDialog({
  open,
  onOpenChange,
  title,
  description,
  pending,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  pending?: boolean;
  initial?: {
    name: string;
    description: string | null;
    status?: ProjectStatus;
    baseUrl?: string;
  };
  onSubmit: (values: ProjectInput) => void;
}) {
  const form = useForm({
    resolver: zodResolver(projectInputSchema),
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      status: initial?.status ?? "in_progress",
      baseUrl: initial?.baseUrl ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: initial?.name ?? "",
        description: initial?.description ?? "",
        status: initial?.status ?? "in_progress",
        baseUrl: initial?.baseUrl ?? "",
      });
    }
  }, [open, initial?.name, initial?.description, initial?.status, initial?.baseUrl, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.name) || undefined}>
              <FieldLabel htmlFor="project-name">Name</FieldLabel>
              <Input
                id="project-name"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-description">Description</FieldLabel>
              <Textarea
                id="project-description"
                rows={3}
                {...form.register("description")}
              />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.baseUrl) || undefined}>
              <FieldLabel htmlFor="project-base-url">Default Base URL <span className="text-muted-foreground">(optional)</span></FieldLabel>
              <Input id="project-base-url" placeholder="https://api.example.com/v1" {...form.register("baseUrl")} />
              <p className="text-xs text-muted-foreground">New endpoints start with this URL. Each endpoint can use its own.</p>
              <FieldError errors={[form.formState.errors.baseUrl]} />
            </Field>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-3 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span id="project-status-label" className="text-sm font-medium">
                      Documented
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {field.value === "documented"
                        ? "Marked as documented."
                        : "Still in progress. Turn on when the docs are complete."}
                    </span>
                  </div>
                  <Switch
                    aria-labelledby="project-status-label"
                    checked={field.value === "documented"}
                    onCheckedChange={(checked) =>
                      field.onChange(checked ? "documented" : "in_progress")
                    }
                  />
                </div>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
