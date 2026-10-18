"use client";

import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/10 text-destructive shadow-sm">
        <TriangleAlertIcon className="size-6" aria-hidden />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          {error.message || "An unexpected error occurred. Try again in a moment."}
        </p>
      </div>
      <Button onClick={reset} className="gap-2">
        <RefreshCwIcon data-icon="inline-start" />
        Try again
      </Button>
    </main>
  );
}
