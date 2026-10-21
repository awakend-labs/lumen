"use client";

import { Suspense, useEffect, useState, type ReactNode, type RefObject } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

export function DeferredDialog({ title, onClose, children, returnFocus }: { title: string; onClose: () => void; children: ReactNode; returnFocus?: RefObject<HTMLElement | null> }) {
  const [trigger] = useState(() => returnFocus?.current ?? (typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null));
  useEffect(() => () => { queueMicrotask(() => { if (trigger?.isConnected) trigger.focus(); }); }, [trigger]);
  return <Suspense fallback={<Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Loading the editor…</DialogDescription></DialogHeader><div role="status" className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground"><Spinner />Loading…</div></DialogContent>
  </Dialog>}>{children}</Suspense>;
}
