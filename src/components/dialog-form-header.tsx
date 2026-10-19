import type { LucideIcon } from "lucide-react";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/** New / edit project & stash modals — wider and less rounded than default dialogs. */
export const formDialogContentClassName = "sm:max-w-xl rounded-md";
export const formDialogFooterClassName = "rounded-b-md";

export function DialogFormHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <DialogHeader className="flex-row items-start gap-4 space-y-0 text-left">
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary"
        aria-hidden
      >
        <Icon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-1.5 pr-8">
        <DialogTitle className="text-lg font-semibold leading-snug tracking-[-0.02em]">
          {title}
        </DialogTitle>
        {description ? (
          <DialogDescription className="text-pretty leading-relaxed">
            {description}
          </DialogDescription>
        ) : null}
      </div>
    </DialogHeader>
  );
}

export function FieldIconLabel({
  icon: Icon,
  className,
  children,
  ...props
}: React.ComponentProps<typeof FieldLabel> & { icon: LucideIcon }) {
  return (
    <FieldLabel className={cn("gap-1.5", className)} {...props}>
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      {children}
    </FieldLabel>
  );
}
