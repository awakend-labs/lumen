import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  icon: Icon,
  title,
  description,
  badge,
  actions,
  className,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-0 sm:py-0",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/60 text-muted-foreground dark:bg-muted/40">
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
              {title}
            </h1>
            {badge}
          </div>
          {description ? (
            <p className="max-w-2xl text-sm leading-snug text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 pt-0.5">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
