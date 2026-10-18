"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Result = { id: string; kind: string; title: string; context: string; href: string };

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => { const timer = setTimeout(() => setQuery(input.trim()), 250); return () => clearTimeout(timer); }, [input]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(value => !value); } };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  const results = useQuery({ queryKey: ["search", query], queryFn: ({ signal }) => api<Result[]>(`/api/search?q=${encodeURIComponent(query)}`, { signal }), enabled: open && query.length >= 2, staleTime: 0 });
  const waiting = input.trim() !== query || results.isFetching;
  return <>
    <Button variant="outline" size="sm" className="ml-auto shrink-0 text-muted-foreground" onClick={() => setOpen(true)}><Search className="size-4" /><span className="hidden sm:inline">Search workspace</span><kbd className="hidden text-xs md:inline">Ctrl K</kbd></Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Search workspace</DialogTitle><DialogDescription>Find projects, stashes, endpoints, paths, and tags. Up to 30 endpoints and 20 of each other type.</DialogDescription></DialogHeader>
        <Input autoFocus aria-label="Search workspace" maxLength={120} value={input} onChange={event => setInput(event.target.value)} placeholder="Search by name, GET /users, or a tag…" />
        <div className="max-h-[60vh] overflow-y-auto" aria-live="polite">
          {input.trim().length < 2 ? <p className="p-3 text-sm text-muted-foreground">Type at least two characters.</p> : waiting ? <p className="p-3 text-sm">Searching…</p> : results.isError ? <p role="alert" className="p-3 text-sm text-destructive">{results.error.message} <Button variant="ghost" onClick={() => results.refetch()}>Retry</Button></p> : results.data?.length === 0 ? <p className="p-3 text-sm">No matches. Try a route, name, or tag.</p> : results.data?.map(result => <Link key={`${result.kind}-${result.id}`} href={result.href} onClick={() => setOpen(false)} className="block min-w-0 rounded-lg p-3 hover:bg-muted focus-visible:bg-muted">
            <div className="flex gap-3"><span className="min-w-0 flex-1 truncate text-sm font-medium">{result.title}</span><span className="text-xs text-primary">{result.kind}</span></div><p className="truncate text-xs text-muted-foreground">{result.context}</p>
          </Link>)}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
