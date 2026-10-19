"use client";

import { useEffect, useRef, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { api } from "@/lib/api";

export function useEndpointDraft<T extends FieldValues>(projectId: string, key: string, form: UseFormReturn<T>, parse: (payload: string) => T) {
  const [status, setStatus] = useState("Loading draft…");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const revision = useRef("");
  const writeOrder = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const active = useRef(true);
  const latest = useRef("");
  const lastSaved = useRef("");
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const path = `/api/projects/${projectId}/drafts/${encodeURIComponent(key)}`;
  const parseRef = useRef(parse); parseRef.current = parse;

  const flushRef = useRef(() => {});
  flushRef.current = () => {
    if (!active.current || !revision.current || !latest.current || latest.current === lastSaved.current) return;
    void fetch(path, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: revision.current, writeOrder: ++writeOrder.current, payload: latest.current }), keepalive: true }).catch(() => {});
  };

  useEffect(() => {
    let disposed = false; active.current = true;
    api<{ revision: string; payload: string | null; writeOrder: number }>(path, { signal: AbortSignal.timeout(10000) }).then(draft => {
      if (disposed) return;
      revision.current = draft.revision;
      writeOrder.current = draft.writeOrder;
      if (draft.payload) { form.reset(parseRef.current(draft.payload)); setStatus("Draft restored"); }
      else setStatus("Drafts save automatically");
      lastSaved.current = latest.current = JSON.stringify(form.getValues());
      setLoading(false);
    }).catch(() => {
      if (disposed) return;
      setStatus("Draft recovery unavailable. Your changes cannot be autosaved; save the endpoint before leaving."); setError(true); setLoading(false);
    });
    return () => { disposed = true; flushRef.current(); active.current = false; clearTimeout(timer.current); };
  }, [path, form]);

  useEffect(() => {
    if (loading || !revision.current) return;
    const subscription = form.watch(() => {
      latest.current = JSON.stringify(form.getValues());
      clearTimeout(timer.current);
      if (!active.current || latest.current === lastSaved.current) return;
      setStatus("Saving draft…");
      timer.current = setTimeout(() => {
        const payload = latest.current; const token = revision.current; const order = ++writeOrder.current;
        queue.current = queue.current.catch(() => {}).then(async () => {
          if (!active.current || token !== revision.current) return;
          try {
            await api(path, { method: "PUT", signal: AbortSignal.timeout(10000), body: JSON.stringify({ revision: token, writeOrder: order, payload }) });
            lastSaved.current = payload;
            if (active.current && latest.current === payload) { setStatus("Draft saved"); setError(false); }
          } catch { if (active.current && latest.current === payload) { setStatus("Draft not saved. Save the endpoint before leaving."); setError(true); } }
        });
      }, 600);
    });
    const flush = () => flushRef.current();
    window.addEventListener("pagehide", flush);
    return () => { subscription.unsubscribe(); window.removeEventListener("pagehide", flush); clearTimeout(timer.current); };
  }, [loading, form, path]);

  async function clear() {
    active.current = false; clearTimeout(timer.current);
    if (!revision.current) return;
    await queue.current.catch(() => {});
    let result: { revision: string };
    try {
      result = await api<{ revision: string }>(path, { method: "DELETE", signal: AbortSignal.timeout(10000), body: JSON.stringify({ revision: revision.current }) });
    } catch (cause) { active.current = true; throw cause; }
    revision.current = result.revision;
    writeOrder.current = 0;
  }

  async function discard(values: T) {
    await clear(); form.reset(values);
    latest.current = lastSaved.current = JSON.stringify(values);
    active.current = true; setStatus("Draft discarded"); setError(false);
  }
  return { status, loading, error, clear, discard, token: () => revision.current ? { key, revision: revision.current } : undefined };
}
