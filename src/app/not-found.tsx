import { CompassIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-sm">
        <CompassIcon className="size-6" aria-hidden />
      </span>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          That link does not match anything in Lumen. It may have moved or been removed.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/dashboard">Go to projects</Link>
        </Button>
      </div>
    </main>
  );
}
