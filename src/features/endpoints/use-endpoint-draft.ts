"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { api, ApiError } from "@/lib/api";

export function useEndpointDraft<T extends FieldValues>(projectId: string, key: string, form: UseFormReturn<T>, parse: (payload: string) => T) {
  const [status, setStatus] = useState("Checking for a saved draft… You can start editing.");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recovered, setRecovered] = useState<T | null>(null);
  const [conflict, setConflict] = useState(false);
  const conflictLoaded = useRef(false);
  const staleRevision = useRef(false);
  const generation = useRef(0);
  const awaitingChoice = useRef(false);
  const revision = useRef("");
  const writeOrder = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const active = useRef(true);
  const latest = useRef("");
  const changeVersion = useRef(0);
  const lastSaved = useRef("");
  const hasSavedSnapshot = useRef(false);
  const isCurrentSaved = useCallback(() => hasSavedSnapshot.current && !awaitingChoice.current && JSON.stringify(form.getValues()) === lastSaved.current, [form]);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const path = `/api/projects/${projectId}/drafts/${encodeURIComponent(key)}`;
  const parseRef = useRef(parse); parseRef.current = parse;

  const recoverConflict = useRef(async () => {});
  recoverConflict.current = async () => {
    const current = ++generation.current;
    awaitingChoice.current = true;
    conflictLoaded.current = false;
    clearTimeout(timer.current);
    setConflict(true); setRecovered(null); setError(false);
    setStatus("Draft changed in another tab. Autosave is paused while the saved draft is checked.");
    try {
      const draft = await api<{ revision: string; payload: string | null; writeOrder: number }>(path, { signal: AbortSignal.timeout(10000) });
      if (!active.current || current !== generation.current) return;
      const restored = draft.payload ? parseRef.current(draft.payload) : null;
      revision.current = draft.revision; writeOrder.current = draft.writeOrder;
      staleRevision.current = false; conflictLoaded.current = true;
      lastSaved.current = restored ? JSON.stringify(restored) : "";
      hasSavedSnapshot.current = Boolean(restored);
      setRecovered(restored);
      setStatus(restored
        ? "Draft changed in another tab. Restore the saved draft or keep your current edits to resume autosave."
        : "Draft changed in another tab and was cleared. Keep your current edits to resume autosave.");
    } catch {
      if (!active.current || current !== generation.current) return;
      setStatus("Draft changed in another tab. Could not check the saved draft. Choose Keep current edits to retry; your form has been kept.");
    }
  };

  const flushRef = useRef(() => {});
  flushRef.current = () => {
    if (!active.current || awaitingChoice.current || !revision.current) return;
    // Flushes must include edits made since the last debounced snapshot.
    latest.current = JSON.stringify(form.getValues());
    if (!latest.current || latest.current === lastSaved.current) return;
    const current = generation.current;
    void fetch(path, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: revision.current, writeOrder: ++writeOrder.current, payload: latest.current }), keepalive: true }).then(response => {
      if (response.status === 409 && active.current && current === generation.current) void recoverConflict.current();
    }).catch(() => {});
  };

  useEffect(() => {
    let disposed = false; active.current = true; ++generation.current;
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
        hasSavedSnapshot.current = true;
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
    if (loading || recovered || conflict || (!revision.current && !staleRevision.current)) return;
    const changed = () => {
      const version = ++changeVersion.current;
      clearTimeout(timer.current);
      if (!active.current || awaitingChoice.current) return;
      if (staleRevision.current) { void recoverConflict.current(); return; }
      setStatus("Saving draft…");
      timer.current = setTimeout(() => {
        const payload = JSON.stringify(form.getValues());
        latest.current = payload;
        if (payload === lastSaved.current) {
          setStatus(hasSavedSnapshot.current ? "Draft saved" : "Drafts save automatically");
          return;
        }
        const token = revision.current; const order = ++writeOrder.current; const current = generation.current;
        queue.current = queue.current.catch(() => {}).then(async () => {
          if (!active.current || awaitingChoice.current || token !== revision.current || current !== generation.current) return;
          try {
            await api(path, { method: "PUT", signal: AbortSignal.timeout(10000), body: JSON.stringify({ revision: token, writeOrder: order, payload }) });
            if (!active.current || current !== generation.current) return;
            lastSaved.current = payload;
            hasSavedSnapshot.current = true;
            if (active.current && changeVersion.current === version) { setStatus("Draft saved"); setError(false); }
          } catch (cause) {
            if (!active.current || current !== generation.current) return;
            if (cause instanceof ApiError && cause.status === 409) void recoverConflict.current();
            else if (changeVersion.current === version) { setStatus("Draft not saved. Save the endpoint before leaving."); setError(true); }
          }
        });
      }, 600);
    };
    const subscription = form.watch(changed);
    // Recovery is a synchronization boundary, not a keystroke path.
    if (JSON.stringify(form.getValues()) !== lastSaved.current) changed();
    const flush = () => flushRef.current();
    window.addEventListener("pagehide", flush);
    return () => { subscription.unsubscribe(); window.removeEventListener("pagehide", flush); clearTimeout(timer.current); };
  }, [loading, recovered, conflict, form, path]);

  function resolveRecovery(restore: boolean) {
    if (conflict && !conflictLoaded.current) { void recoverConflict.current(); return; }
    if (!recovered && !conflict) return;
    if (restore) {
      if (!recovered) return;
      form.reset(recovered); latest.current = lastSaved.current = JSON.stringify(form.getValues());
      hasSavedSnapshot.current = true;
      setStatus("Draft restored");
    } else setStatus("Saving current edits…");
    awaitingChoice.current = false; setRecovered(null); setConflict(false);
  }

  async function clear() {
    active.current = false; ++generation.current; clearTimeout(timer.current);
    if (!revision.current) return;
    await queue.current.catch(() => {});
    let result: { revision: string };
    try {
      result = await api<{ revision: string }>(path, { method: "DELETE", signal: AbortSignal.timeout(10000), body: JSON.stringify({ revision: revision.current }) });
    } catch (cause) {
      // Another tab may have published or discarded this revision. Reset this
      // form without deleting that tab's replacement draft.
      if (cause instanceof ApiError && cause.status === 409) {
        revision.current = ""; staleRevision.current = true; return;
      }
      active.current = true; throw cause;
    }
    revision.current = result.revision;
    writeOrder.current = 0;
    staleRevision.current = false;
  }

  async function discard(values: T) {
    await clear(); form.reset(values);
    latest.current = lastSaved.current = JSON.stringify(values);
    hasSavedSnapshot.current = true;
    awaitingChoice.current = false; setRecovered(null); setConflict(false);
    active.current = true; setStatus("Draft discarded"); setError(false);
  }
  return { status, loading, error, clear, discard, isCurrentSaved, hasRecoveredDraft: Boolean(recovered) || conflict, canRestore: Boolean(recovered),
    restore: () => resolveRecovery(true), keepCurrent: () => resolveRecovery(false),
    token: () => revision.current && !awaitingChoice.current ? { key, revision: revision.current } : undefined };
}
