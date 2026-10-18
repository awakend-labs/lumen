import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CodeXmlIcon, LayersIcon, LayoutGridIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

const features = [
  { icon: LayersIcon, title: "Stashes", body: "Group endpoints by domain, like auth or payments." },
  { icon: LayoutGridIcon, title: "Grid or list", body: "Scan routes as cards or a dense, sortable list." },
  { icon: UsersIcon, title: "Share projects", body: "Invite editors and viewers with a copyable link." },
];

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top,oklch(0.85_0.17_95/0.2),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.85_0.17_95/0.12),transparent_60%)]"
      />

      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <CodeXmlIcon className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight">Lumen</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-16 px-6 pt-10 pb-20 text-center">
        <section className="flex max-w-2xl flex-col items-center gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium">
            <span className="size-1.5 rounded-full bg-primary" />
            API documentation, quietly done
          </span>
          <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-6xl">
            Document your APIs with <span className="text-primary">clarity</span>.
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Organize endpoints into stashes, scan them in a grid or list, and share projects with
            the people who build against them.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-11 px-5 shadow-sm">
              <Link href="/signup">Create an account</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-5">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </section>

        <ul className="grid w-full gap-4 text-left sm:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-sm dark:border-white/5 dark:bg-white/2"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-semibold">{title}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
