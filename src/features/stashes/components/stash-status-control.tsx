"use client";

import { useState } from "react";
import { Ban, CircleCheck, FlaskConical, Hammer, type LucideIcon } from "lucide-react";
import { ConfirmStatusChange } from "@/components/confirm-status";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSetStashStatus } from "@/features/stashes/queries";
import { canEditContent } from "@/lib/permissions";
import type { ProjectRole, StashStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: {
  value: StashStatus;
  label: string;
  icon: LucideIcon;
  on: string;
  chip: string;
}[] = [
  {
    value: "in_development",
    label: "In development",
    icon: Hammer,
    on: "data-[state=on]:border-stash-amber/40 data-[state=on]:bg-stash-amber/15 data-[state=on]:text-stash-amber",
    chip: "border-stash-amber/40 bg-stash-amber/15 text-stash-amber",
  },
  {
    value: "testing",
    label: "Testing",
    icon: FlaskConical,
    on: "data-[state=on]:border-stash-blue/40 data-[state=on]:bg-stash-blue/15 data-[state=on]:text-stash-blue",
    chip: "border-stash-blue/40 bg-stash-blue/15 text-stash-blue",
  },
  {
    value: "active",
    label: "Active",
    icon: CircleCheck,
    on: "data-[state=on]:border-stash-green/40 data-[state=on]:bg-stash-green/15 data-[state=on]:text-stash-green",
    chip: "border-stash-green/40 bg-stash-green/15 text-stash-green",
  },
  {
    value: "deprecated",
    label: "Deprecated",
    icon: Ban,
    on: "data-[state=on]:border-stash-red/40 data-[state=on]:bg-stash-red/15 data-[state=on]:text-stash-red",
    chip: "border-stash-red/40 bg-stash-red/15 text-stash-red",
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

export const STASH_STATUS_TEXT_CLASS: Record<StashStatus, string> = {
  in_development: "text-stash-amber",
  testing: "text-stash-blue",
  active: "text-stash-green",
  deprecated: "text-stash-red",
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
  const [pendingStatus, setPendingStatus] = useState<StashStatus | null>(null);
  const from = OPTIONS.find((option) => option.value === status) ?? OPTIONS[0];
  const to = OPTIONS.find((option) => option.value === pendingStatus);

  return (
    <>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={status}
        disabled={!editable || setStatus.isPending}
        onValueChange={(value) => {
          if (!value || value === status) return;
          setPendingStatus(value as StashStatus);
        }}
        aria-label="Stash status"
        className="flex-wrap gap-2 border-0 bg-transparent p-0 shadow-none"
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
      {to ? (
        <ConfirmStatusChange
          open
          onOpenChange={(open) => {
            if (!open) setPendingStatus(null);
          }}
          title="Change stash status?"
          description={
            pendingStatus === "deprecated"
              ? "The stash stays in the project, but this signals it should no longer be used."
              : "This status is visible to everyone with access to the project."
          }
          fromLabel={from.label}
          toLabel={to.label}
          fromClassName={from.chip}
          toClassName={to.chip}
          fromIcon={from.icon}
          toIcon={to.icon}
          pending={setStatus.isPending}
          caution={pendingStatus === "deprecated"}
          confirmLabel={
            pendingStatus === "deprecated"
              ? "Mark as deprecated"
              : `Mark as ${to.label.toLowerCase()}`
          }
          onConfirm={() => {
            setStatus.mutate(
              { stashId, status: to.value },
              { onSettled: () => setPendingStatus(null) },
            );
          }}
        />
      ) : null}
    </>
  );
}
