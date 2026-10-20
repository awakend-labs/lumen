"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { searchCachedWorkspace } from "@/lib/workspace-search";
import type { ProjectDetail, ProjectListItem } from "@/lib/types";

type Result = { id: string; kind: string; title: string; context: string; href: string; };

export function GlobalSearch() {
  const router = useRouter();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const resultList = useRef<HTMLDivElement>(null);
  const changeOpen = useCallback((value: boolean) => {
    setInput("");
    setQuery("");
    setActiveIndex(0);
    setOpen(value);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 150);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        changeOpen(!open);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [open, changeOpen]);

  const results = useQuery({
    queryKey: ["search", query],
    queryFn: ({ signal }) =>
      api<Result[]>(`/api/search?q=${encodeURIComponent(query)}`, { signal }),
    enabled: open && query.length >= 2,
    staleTime: 30_000,
    retry: false,
  });

  const waiting = input.trim() !== query || results.isFetching;
  const cachedDetails = client.getQueriesData<ProjectDetail>({ queryKey: ["projects"] }).flatMap(([key, data]) => key.length === 2 && data?.stashes ? [data] : []);
  const local = searchCachedWorkspace(input, client.getQueryData<ProjectListItem[]>(["projects"]) ?? [], cachedDetails);
  const visibleResults = [...new Map([...local, ...(input.trim() === query ? results.data ?? [] : [])].map(result => [`${result.kind}:${result.id}`, result])).values()];
  const selectedIndex = Math.min(activeIndex, Math.max(0, visibleResults.length - 1));
  useEffect(() => {
    resultList.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, visibleResults.length]);

  return (
    <>
      <Button
        type="button"
        aria-label="Search workspace"
        variant="outline"
        size="sm"
        className={cn(
          "h-9 w-full justify-start gap-2.5 rounded-sm border-border/50 px-3",
          "bg-muted/30 font-normal text-muted-foreground shadow-none",
          "hover:border-border/80 hover:bg-muted/50 hover:text-foreground",
          "dark:border-white/10 dark:bg-white/3 dark:hover:bg-white/6",
          "dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
        )}
        onClick={() => changeOpen(true)}
      >
        <Search className="size-4 shrink-0 text-muted-foreground/80" aria-hidden />
        <span className="truncate text-sm text-muted-foreground/90">
          <span className="hidden sm:inline">Search workspace…</span>
          <span className="sm:hidden">Search…</span>
        </span>
        <kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">Ctrl K</kbd>
      </Button>
      <Dialog open={open} onOpenChange={changeOpen}>
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
              role="combobox"
              aria-expanded={open}
              aria-controls="workspace-search-results"
              aria-autocomplete="list"
              aria-activedescendant={visibleResults.length ? `workspace-search-result-${selectedIndex}` : undefined}
              maxLength={120}
              value={input}
              onChange={(event) => { setInput(event.target.value); setActiveIndex(0); }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing || !visibleResults.length) return;
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((selectedIndex + (event.key === "ArrowDown" ? 1 : -1) + visibleResults.length) % visibleResults.length);
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  const result = visibleResults[selectedIndex];
                  changeOpen(false);
                  router.push(result.href);
                }
              }}
              placeholder="Name, route, or tag…"
              className="rounded-sm pl-9"
            />
          </div>
          <div ref={resultList} id="workspace-search-results" role="listbox" aria-label="Search results" className="max-h-[60vh] overflow-y-auto rounded-md border border-border/40 dark:border-white/5" aria-live="polite">
            {input.trim().length < 2 ? (
              <p className="p-4 text-sm text-muted-foreground">Type at least two characters.</p>
            ) : waiting && visibleResults.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Searching…</p>
            ) : results.isError && visibleResults.length === 0 ? (
              <p role="alert" className="p-4 text-sm text-destructive">
                {results.error.message}{" "}
                <Button variant="ghost" size="sm" onClick={() => results.refetch()}>
                  Retry
                </Button>
              </p>
            ) : visibleResults.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No matches. Try a route, name, or tag.
              </p>
            ) : (
              visibleResults.map((result, index) => (
                <Link
                  key={`${result.kind}-${result.id}`}
                  href={result.href}
                  id={`workspace-search-result-${index}`}
                  role="option"
                  aria-selected={index === selectedIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onClick={() => changeOpen(false)}
                  className={cn("block min-w-0 border-b border-border/30 p-3 last:border-b-0 hover:bg-muted/50 focus-visible:bg-muted/50 dark:border-white/5", index === selectedIndex && "bg-muted/50")}
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
