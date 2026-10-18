import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        That link does not match anything in Lumen.
      </p>
      <div>
        <Button asChild>
          <Link href="/dashboard">Go to projects</Link>
        </Button>
      </div>
    </main>
  );
}
