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
        "flex flex-wrap items-end justify-between gap-5 py-2 sm:py-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-4">
        {Icon ? (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-accent-foreground">
            <Icon className="size-5" aria-hidden />
          </span>
        ) : null}
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">{title}</h1>
            {badge}
          </div>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
