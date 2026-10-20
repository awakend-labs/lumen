"use client";

import { Link2Icon } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { methodRouteAccentClass } from "@/components/method-badge";
import { endpointUrl } from "@/lib/endpoint-path";
import type { EndpointRecord, HttpMethod } from "@/lib/types";
import { cn } from "@/lib/utils";

const PATH_PARAM_RE =
  /^(\{[A-Za-z_][A-Za-z0-9_]*\}|:[A-Za-z_][A-Za-z0-9_]*)$/;

function PathHighlight({ text }: { text: string }) {
  const parts = text.split(
    /(\{[A-Za-z_][A-Za-z0-9_]*\}|:[A-Za-z_][A-Za-z0-9_]*)/g,
  );

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        if (PATH_PARAM_RE.test(part)) {
          return (
            <span
              key={index}
              className="rounded-sm bg-primary/12 px-0.5 font-medium text-primary dark:bg-primary/18"
            >
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

function resolveRouteDisplay(
  endpoint: Pick<EndpointRecord, "path" | "baseUrl" | "version">,
) {
  const trimmedBase = endpoint.baseUrl?.trim();
  if (!trimmedBase) {
    return {
      copyValue: endpoint.path,
      origin: null as string | null,
      pathname: endpoint.path,
    };
  }

  try {
    const url = endpointUrl(trimmedBase, endpoint.path, endpoint.version);
    return {
      copyValue: url.toString().replace(/%7B/gi, "{").replace(/%7D/gi, "}"),
      origin: url.origin,
      pathname: `${url.pathname}${url.search}`.replace(/%7B/gi, "{").replace(/%7D/gi, "}"),
    };
  } catch {
    return {
      copyValue: endpoint.path,
      origin: null as string | null,
      pathname: endpoint.path,
    };
  }
}

export function EndpointPathBar({
  method,
  endpoint,
}: {
  method: HttpMethod;
  endpoint: Pick<EndpointRecord, "path" | "baseUrl" | "version">;
}) {
  const { copyValue, origin, pathname } = resolveRouteDisplay(endpoint);
  const copyLabel = origin ? "Copy request URL" : "Copy path";

  return (
    <div className="mt-3 flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Link2Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
        {origin ? "Request URL" : "Route"}
      </div>
      <div
        className={cn(
          "flex min-w-0 overflow-hidden rounded-md border border-border/80 bg-muted/30 dark:bg-muted/20",
          "border-l-[3px]",
          methodRouteAccentClass[method],
        )}
      >
        <div className="flex min-w-0 flex-1 items-center px-3 py-2 sm:px-3.5 sm:py-2.5">
          <code
            className="block min-w-0 overflow-x-auto font-mono text-[13px] leading-relaxed tracking-tight whitespace-nowrap text-foreground/90 [scrollbar-width:thin] sm:text-sm"
          >
            {origin ? (
              <>
                <span className="text-muted-foreground">{origin}</span>
                <PathHighlight text={pathname} />
              </>
            ) : (
              <PathHighlight text={pathname} />
            )}
          </code>
        </div>
        <div
          className="flex shrink-0 items-center border-l border-border/80 bg-card/50 px-0.5 dark:bg-card/30"
        >
          <CopyButton value={copyValue} label={copyLabel} />
        </div>
      </div>
    </div>
  );
}
