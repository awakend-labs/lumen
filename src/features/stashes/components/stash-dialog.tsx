"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { stashDotClass } from "@/lib/format";
import { STASH_COLORS, STASH_STATUSES, type StashColor, type StashRecord, type StashStatus } from "@/lib/types";
import { STASH_STATUS_LABEL } from "@/features/stashes/components/stash-status-control";
import { stashInputSchema, type StashInput } from "@/lib/validators";
import { cn } from "@/lib/utils";

export function StashDialog({
  open,
  onOpenChange,
  pending,
  stash,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending?: boolean;
  stash?: StashRecord | null;
  onSubmit: (values: StashInput) => void;
}) {
  const form = useForm({
    resolver: zodResolver(stashInputSchema),
    defaultValues: {
      name: stash?.name ?? "",
      description: stash?.description ?? "",
      color: stash?.color ?? "blue",
      status: stash?.status ?? "in_development",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: stash?.name ?? "",
        description: stash?.description ?? "",
        color: stash?.color ?? "blue",
        status: stash?.status ?? "in_development",
      });
    }
  }, [open, stash, form]);

  const color = form.watch("color");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{stash ? "Edit stash" : "New stash"}</DialogTitle>
          <DialogDescription>
            Stashes group related endpoints, like Users or Payments.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.name) || undefined}>
              <FieldLabel htmlFor="stash-name">Name</FieldLabel>
              <Input
                id="stash-name"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="stash-description">Description</FieldLabel>
              <Textarea id="stash-description" rows={3} {...form.register("description")} />
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={form.watch("status")}
                onValueChange={(value) => form.setValue("status", value as StashStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STASH_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STASH_STATUS_LABEL[status]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Color</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={2}
                value={color}
                onValueChange={(value) => {
                  if (value) form.setValue("color", value as StashColor);
                }}
              >
                {STASH_COLORS.map((item) => (
                  <ToggleGroupItem key={item} value={item} aria-label={item} className="px-2">
                    <span className={cn("size-3 rounded-full", stashDotClass(item))} />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
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
