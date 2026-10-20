import { cn } from "@/lib/utils";
import type { HttpMethod } from "@/lib/types";

/** Left accent for route / URL bars on endpoint detail. */
export const methodRouteAccentClass: Record<HttpMethod, string> = {
  GET: "border-l-method-get",
  POST: "border-l-method-post",
  PUT: "border-l-method-put",
  PATCH: "border-l-method-put",
  DELETE: "border-l-method-delete",
  OPTIONS: "border-l-muted-foreground/40",
  HEAD: "border-l-muted-foreground/40",
};

export const methodTextClass: Record<HttpMethod, string> = {
  GET: "text-method-get",
  POST: "text-method-post",
  PUT: "text-method-put",
  PATCH: "text-method-put",
  DELETE: "text-method-delete",
  OPTIONS: "text-muted-foreground",
  HEAD: "text-muted-foreground",
};

const methodClass: Record<HttpMethod, string> = {
  GET: `bg-method-get/12 ${methodTextClass.GET}`,
  POST: `bg-method-post/12 ${methodTextClass.POST}`,
  PUT: `bg-method-put/15 ${methodTextClass.PUT}`,
  PATCH: `bg-method-put/15 ${methodTextClass.PATCH}`,
  DELETE: `bg-method-delete/12 ${methodTextClass.DELETE}`,
  OPTIONS: `bg-muted ${methodTextClass.OPTIONS}`,
  HEAD: `bg-muted ${methodTextClass.HEAD}`,
};

export function EndpointVersionBadge({
  version,
  className,
}: {
  version: string;
  className?: string;
}) {
  const label = version.trim() || "v1";
  return (
    <span
      title={label}
      className={cn(
        "inline-flex h-5 max-w-24 shrink-0 items-center justify-center truncate rounded-sm border border-border/80 bg-muted/45 px-2 font-mono text-[11px] font-semibold tracking-wide text-primary tabular-nums dark:bg-muted/35 dark:text-primary",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function MethodBadge({
  method,
  className,
}: {
  method: HttpMethod;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-14 items-center justify-center rounded-sm px-1.5 font-mono text-[11px] font-semibold tracking-wide",
        methodClass[method],
        className,
      )}
    >
      {method}
    </span>
  );
}

export function statusClass(code: number) {
  if (code >= 200 && code < 300) return "bg-method-post/12 text-method-post";
  if (code >= 400 && code < 500) return "bg-method-put/15 text-method-put";
  if (code >= 500) return "bg-method-delete/12 text-method-delete";
  return "bg-muted text-muted-foreground";
}
