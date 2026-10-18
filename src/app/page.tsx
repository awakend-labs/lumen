import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-24">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          L
        </span>
        Lumen
      </div>
      <div className="flex flex-col gap-4">
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
          API documentation with a quieter interface.
        </h1>
        <p className="max-w-lg text-base leading-7 text-muted-foreground">
          Organize endpoints into stashes, switch between a card grid and a dense list, and invite editors or viewers when you are ready.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/signup">Create an account</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
