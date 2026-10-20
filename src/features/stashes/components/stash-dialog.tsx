"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlignLeftIcon,
  ActivityIcon,
  LayersIcon,
  PaletteIcon,
  PencilLineIcon,
  TagIcon,
} from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  DialogFormHeader,
  FieldIconLabel,
  formDialogContentClassName,
  formDialogFooterClassName,
} from "@/components/dialog-form-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
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
import { stashColorPickerItemClass, stashDotClass } from "@/lib/format";
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

  const dialogTitle = stash ? "Edit stash" : "New stash";
  const HeaderIcon = stash ? PencilLineIcon : LayersIcon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(formDialogContentClassName, "flex max-h-[90dvh] min-w-0 flex-col overflow-hidden")}>
        <DialogFormHeader
          icon={HeaderIcon}
          title={dialogTitle}
          description="Stashes group related endpoints, like Users or Payments."
        />
        <form className="flex min-h-0 min-w-0 flex-col gap-6" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="min-h-0 min-w-0 gap-5 overflow-y-auto px-1 [overflow-wrap:anywhere]">
            <Field data-invalid={Boolean(form.formState.errors.name) || undefined}>
              <FieldIconLabel icon={TagIcon} htmlFor="stash-name">Name</FieldIconLabel>
              <Input
                id="stash-name"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.description) || undefined}>
              <FieldIconLabel icon={AlignLeftIcon} htmlFor="stash-description">
                Description
              </FieldIconLabel>
              <Textarea id="stash-description" rows={3} className="field-sizing-fixed max-h-[40dvh] min-w-0 resize-y" aria-invalid={Boolean(form.formState.errors.description)} aria-describedby="stash-description-error stash-description-hint" {...form.register("description")} />
              <p id="stash-description-hint" className="text-xs text-muted-foreground">Up to 500 characters.</p>
              <FieldError id="stash-description-error" errors={[form.formState.errors.description]} />
            </Field>
            <Field>
              <FieldIconLabel icon={ActivityIcon}>Status</FieldIconLabel>
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
              <FieldIconLabel icon={PaletteIcon}>Color</FieldIconLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={2}
                className="flex w-full flex-wrap gap-2"
                value={color}
                onValueChange={(value) => {
                  if (value) form.setValue("color", value as StashColor);
                }}
              >
                {STASH_COLORS.map((item) => (
                  <ToggleGroupItem
                    key={item}
                    value={item}
                    aria-label={`${item} color`}
                    className={cn(
                      "size-9 shrink-0 rounded-sm border border-border/80 bg-background p-0 shadow-none",
                      "hover:border-foreground/25 hover:bg-muted/40",
                      "data-[state=off]:bg-background data-[state=on]:shadow-sm",
                      "data-[state=on]:ring-offset-2 data-[state=on]:ring-offset-background",
                      stashColorPickerItemClass(item),
                    )}
                  >
                    <span
                      className={cn(
                        "size-4 rounded-sm ring-1 ring-inset ring-black/15 dark:ring-white/20",
                        stashDotClass(item),
                      )}
                    />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
          </FieldGroup>
          <DialogFooter className={cn(formDialogFooterClassName, "shrink-0")}>
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
