"use client";

import { ArrowRight, Ban, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function ConfirmStatusChange({
  open,
  onOpenChange,
  title,
  description,
  fromLabel,
  toLabel,
  fromClassName,
  toClassName,
  fromIcon: FromIcon,
  toIcon: ToIcon,
  pending,
  caution = false,
  confirmLabel = "Update status",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fromLabel: string;
  toLabel: string;
  fromClassName: string;
  toClassName: string;
  fromIcon: LucideIcon;
  toIcon: LucideIcon;
  pending?: boolean;
  caution?: boolean;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  const MediaIcon = caution ? Ban : RefreshCw;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent className="status-change-dialog gap-5 border-border px-5 py-5 sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia
            className={cn(
              caution
                ? "bg-stash-red/15 text-stash-red"
                : "bg-primary/15 text-primary",
            )}
          >
            <MediaIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-2 flex w-full items-center justify-center gap-2">
          <StatusChip
            icon={FromIcon}
            label={fromLabel}
            className={fromClassName}
          />
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
          <StatusChip icon={ToIcon} label={toLabel} className={toClassName} />
        </div>
        <AlertDialogFooter className="-mx-5 -mb-5 px-5 py-5">
          <AlertDialogCancel
            size="sm"
            className="min-w-[5.25rem] px-4"
            disabled={pending}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            size="sm"
            variant="outline"
            className="status-change-confirm border-destructive/45 bg-background text-destructive transition-[background-color] duration-200 hover:bg-destructive/25 hover:text-destructive active:bg-destructive/30 active:text-destructive"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StatusChip({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 rounded-sm border border-border px-2.5 py-1 text-xs font-medium",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {label}
    </span>
  );
}
