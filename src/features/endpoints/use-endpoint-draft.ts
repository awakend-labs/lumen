"use client";

import { useEffect, useRef, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { api } from "@/lib/api";

export function useEndpointDraft<T extends FieldValues>(projectId: string, key: string, form: UseFormReturn<T>, parse: (payload: string) => T) {
  const [status, setStatus] = useState("Checking for a saved draft… You can start editing.");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recovered, setRecovered] = useState<T | null>(null);
  const awaitingChoice = useRef(false);
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
    if (!active.current || awaitingChoice.current || !revision.current || !latest.current || latest.current === lastSaved.current) return;
    void fetch(path, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: revision.current, writeOrder: ++writeOrder.current, payload: latest.current }), keepalive: true }).catch(() => {});
  };

  useEffect(() => {
    let disposed = false; active.current = true;
    const initial = JSON.stringify(form.getValues());
    api<{ revision: string; payload: string | null; writeOrder: number }>(path, { signal: AbortSignal.timeout(10000) }).then(draft => {
      if (disposed) return;
      const restored = draft.payload ? parseRef.current(draft.payload) : null;
      revision.current = draft.revision;
      writeOrder.current = draft.writeOrder;
      if (restored && JSON.stringify(form.getValues()) !== initial) {
        awaitingChoice.current = true; setRecovered(restored);
        lastSaved.current = JSON.stringify(restored);
        setStatus("A saved draft is available. Restore it or keep your current edits.");
      } else if (restored) {
        form.reset(restored); lastSaved.current = JSON.stringify(form.getValues());
        setStatus("Draft restored");
      } else {
        lastSaved.current = initial;
        setStatus("Drafts save automatically");
      }
      latest.current = JSON.stringify(form.getValues());
      setLoading(false);
    }).catch(() => {
      if (disposed) return;
      setStatus("Draft recovery unavailable. Your changes cannot be autosaved; save the endpoint before leaving."); setError(true); setLoading(false);
    });
    return () => { disposed = true; flushRef.current(); active.current = false; clearTimeout(timer.current); };
  }, [path, form]);

  useEffect(() => {
    if (loading || recovered || !revision.current) return;
    const changed = () => {
      latest.current = JSON.stringify(form.getValues());
      clearTimeout(timer.current);
      if (!active.current || awaitingChoice.current || latest.current === lastSaved.current) return;
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
    };
    const subscription = form.watch(changed);
    changed(); // Also save edits made while the initial recovery request was pending.
    const flush = () => flushRef.current();
    window.addEventListener("pagehide", flush);
    return () => { subscription.unsubscribe(); window.removeEventListener("pagehide", flush); clearTimeout(timer.current); };
  }, [loading, recovered, form, path]);

  function resolveRecovery(restore: boolean) {
    if (!recovered) return;
    if (restore) {
      form.reset(recovered); latest.current = lastSaved.current = JSON.stringify(form.getValues());
      setStatus("Draft restored");
    } else setStatus("Saving current edits…");
    awaitingChoice.current = false; setRecovered(null);
  }

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
    awaitingChoice.current = false; setRecovered(null);
    active.current = true; setStatus("Draft discarded"); setError(false);
  }
  return { status, loading, error, clear, discard, hasRecoveredDraft: Boolean(recovered),
    restore: () => resolveRecovery(true), keepCurrent: () => resolveRecovery(false),
    token: () => revision.current ? { key, revision: revision.current } : undefined };
}
