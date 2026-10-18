"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Result = { id: string; kind: string; title: string; context: string; href: string };

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 250);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  const results = useQuery({
    queryKey: ["search", query],
    queryFn: ({ signal }) =>
      api<Result[]>(`/api/search?q=${encodeURIComponent(query)}`, { signal }),
    enabled: open && query.length >= 2,
    staleTime: 0,
  });

  const waiting = input.trim() !== query || results.isFetching;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "h-9 w-full justify-start gap-2.5 rounded-lg border-border/50 px-3",
          "bg-muted/30 font-normal text-muted-foreground shadow-none",
          "hover:border-border/80 hover:bg-muted/50 hover:text-foreground",
          "dark:border-white/10 dark:bg-white/3 dark:hover:bg-white/6",
          "dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="size-4 shrink-0 text-muted-foreground/80" aria-hidden />
        <span className="truncate text-sm text-muted-foreground/90">
          <span className="hidden sm:inline">Search projects, routes, and tags…</span>
          <span className="sm:hidden">Search…</span>
        </span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-4 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Search workspace</DialogTitle>
            <DialogDescription>
              Find projects, stashes, endpoints, paths, and tags.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              autoFocus
              aria-label="Search workspace"
              maxLength={120}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Name, route, or tag…"
              className="pl-9"
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border/40 dark:border-white/5" aria-live="polite">
            {input.trim().length < 2 ? (
              <p className="p-4 text-sm text-muted-foreground">Type at least two characters.</p>
            ) : waiting ? (
              <p className="p-4 text-sm text-muted-foreground">Searching…</p>
            ) : results.isError ? (
              <p role="alert" className="p-4 text-sm text-destructive">
                {results.error.message}{" "}
                <Button variant="ghost" size="sm" onClick={() => results.refetch()}>
                  Retry
                </Button>
              </p>
            ) : results.data?.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No matches. Try a route, name, or tag.
              </p>
            ) : (
              results.data?.map((result) => (
                <Link
                  key={`${result.kind}-${result.id}`}
                  href={result.href}
                  onClick={() => setOpen(false)}
                  className="block min-w-0 border-b border-border/30 p-3 last:border-b-0 hover:bg-muted/50 focus-visible:bg-muted/50 dark:border-white/5"
                >
                  <div className="flex gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{result.title}</span>
                    <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                      {result.kind}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{result.context}</p>
                </Link>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
