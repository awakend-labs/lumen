import { cn } from "@/lib/utils";
import type { HttpMethod } from "@/lib/types";

const methodClass: Record<HttpMethod, string> = {
  GET: "bg-method-get/12 text-method-get",
  POST: "bg-method-post/12 text-method-post",
  PUT: "bg-method-put/15 text-method-put",
  PATCH: "bg-method-put/15 text-method-put",
  DELETE: "bg-method-delete/12 text-method-delete",
  OPTIONS: "bg-muted text-muted-foreground",
  HEAD: "bg-muted text-muted-foreground",
};

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
        "inline-flex h-5 min-w-14 items-center justify-center rounded-md px-1.5 font-mono text-[11px] font-semibold tracking-wide",
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
