"use client";

import { Ban, CircleCheck, FlaskConical, Hammer } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSetStashStatus } from "@/features/stashes/queries";
import { canEditContent } from "@/lib/permissions";
import type { ProjectRole, StashStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: {
  value: StashStatus;
  label: string;
  icon: typeof Hammer;
  on: string;
}[] = [
  {
    value: "in_development",
    label: "In development",
    icon: Hammer,
    on: "data-[state=on]:border-stash-amber/40 data-[state=on]:bg-stash-amber/15 data-[state=on]:text-stash-amber",
  },
  {
    value: "testing",
    label: "Testing",
    icon: FlaskConical,
    on: "data-[state=on]:border-stash-blue/40 data-[state=on]:bg-stash-blue/15 data-[state=on]:text-stash-blue",
  },
  {
    value: "active",
    label: "Active",
    icon: CircleCheck,
    on: "data-[state=on]:border-stash-green/40 data-[state=on]:bg-stash-green/15 data-[state=on]:text-stash-green",
  },
  {
    value: "deprecated",
    label: "Deprecated",
    icon: Ban,
    on: "data-[state=on]:border-stash-red/40 data-[state=on]:bg-stash-red/15 data-[state=on]:text-stash-red",
  },
];

export const STASH_STATUS_LABEL: Record<StashStatus, string> = {
  in_development: "In development",
  testing: "Testing",
  active: "Active",
  deprecated: "Deprecated",
};

export const STASH_STATUS_CLASS: Record<StashStatus, string> = {
  in_development: "bg-stash-amber/15 text-stash-amber",
  testing: "bg-stash-blue/15 text-stash-blue",
  active: "bg-stash-green/15 text-stash-green",
  deprecated: "bg-stash-red/15 text-stash-red",
};

export function StashStatusControl({
  projectId,
  stashId,
  status,
  role,
}: {
  projectId: string;
  stashId: string;
  status: StashStatus;
  role: ProjectRole;
}) {
  const setStatus = useSetStashStatus(projectId);
  const editable = canEditContent(role);

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={status}
      disabled={!editable || setStatus.isPending}
      onValueChange={(value) => {
        if (!value || value === status) return;
        setStatus.mutate({ stashId, status: value as StashStatus });
      }}
      aria-label="Stash status"
      className="flex-wrap rounded-sm border border-border/70 bg-muted/30 p-0.5"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            aria-label={option.label}
            className={cn("h-7 gap-1.5 rounded-sm px-2.5 text-xs", option.on)}
          >
            <Icon className="size-3.5" />
            {option.label}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
