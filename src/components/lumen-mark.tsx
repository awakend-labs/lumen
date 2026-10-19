import { cn } from "@/lib/utils";

export function LumenMark({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={cn("brand-mark shrink-0", className)} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" className={cn("size-6", iconClassName)}>
        <path d="M5 16.5v-5m4.5 7v-10M14 17V5.5m4.5 9v-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
