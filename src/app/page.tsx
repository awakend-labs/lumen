import { LumenMark } from "@/components/lumen-mark";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDownRight, ArrowRight, Braces, Layers, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProductPreview } from "@/components/product-preview";
import { auth } from "@/lib/auth";

const features = [
  { number: "01", icon: Layers, title: "Structure without the clutter.", body: "Organize related endpoints into stashes. Give every API a place that makes sense." },
  { number: "02", icon: Braces, title: "Every detail, in focus.", body: "Parameters, authentication, schemas, and responses. The full picture, clearly documented." },
  { number: "03", icon: Users, title: "The same page. Finally.", body: "Share a project invitation link. Give teammates the right access to view or edit." },
];

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="mx-auto flex w-full max-w-[100rem] items-center justify-between gap-3 px-5 py-6 sm:px-10 lg:px-12 xl:px-16">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Lumen home">
          <LumenMark />
          <span className="text-xl font-semibold tracking-[-0.04em]">Lumen.</span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-3">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started<ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </nav>
      </header>
      <main>
        <section className="mx-auto grid max-w-[100rem] gap-12 px-5 pt-14 pb-16 sm:px-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-10 lg:px-12 xl:px-16 lg:pt-24 lg:pb-28">
          <div>
            <p className="eyebrow flex items-center gap-2.5">
              <span className="size-1.5 bg-primary" />The API documentation workspace</p>
            <h1 className="mt-7 text-[clamp(3.5rem,6.8vw,6rem)] leading-[.98] font-semibold tracking-[-0.07em]">Bring your<br />APIs into<br />
              <span className="relative inline-block">the light.<span aria-hidden className="absolute -bottom-2 left-0 h-[5px] w-full bg-primary" />
              </span>
            </h1>
            <p className="mt-9 max-w-sm text-base leading-7 text-muted-foreground">A home for the details that matter. Organize your endpoints, document with precision, and give your team a clearer way to build.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="px-6">
                <Link href="/signup">Start documenting<ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <a href="#details" className="mt-10 inline-flex items-center gap-3 text-xs text-muted-foreground hover:text-foreground">
              <ArrowDownRight className="size-4" />Considered down to the last parameter.</a>
          </div>
          <div className="relative min-w-0">
            <div aria-hidden className="absolute -top-5 right-5 h-12 w-24 rounded-t-lg bg-primary sm:right-8" />
            <div className="relative">
              <ProductPreview />
            </div>
            <p className="mt-4 text-right font-mono text-[10px] text-muted-foreground">FIG. 01 — A little structure. A lot of clarity.</p>
          </div>
        </section>
        <section id="details" aria-label="Made for your workflow" className="border-y border-border bg-card">
          <div className="mx-auto grid max-w-[100rem] gap-10 px-5 py-14 sm:px-10 md:grid-cols-3 lg:px-12 xl:px-16 lg:py-20">{features.map(({ number, icon: Icon, title, body }) =>
            <article key={number} className="border-t border-border pt-5">
              <div className="mb-8 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">/ {number}</span>
                <Icon className="size-5 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">{body}</p>
            </article>)}</div>
        </section>
        <section aria-labelledby="get-started-heading" className="mx-auto max-w-[100rem] px-5 py-12 sm:px-10 lg:px-12 lg:py-16 xl:px-16">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7 sm:p-10 lg:p-12" style={{ backgroundImage: "var(--surface-gradient)" }}>
            <div aria-hidden className="absolute top-0 left-8 h-px w-24 bg-primary/70 sm:left-10 lg:left-12" />
            <p className="eyebrow mb-7 flex items-center gap-2.5"><span className="size-1.5 rounded-full bg-primary" />Make room for clarity</p>
            <div className="grid items-end gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
              <h2 id="get-started-heading" className="text-[clamp(2.25rem,4.5vw,4.25rem)] leading-[1.06] font-semibold tracking-[-0.055em]">Good docs.<br /><span className="text-muted-foreground">Better building</span><span className="text-primary">.</span></h2>
              <div className="flex flex-col items-start border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
                <p className="max-w-sm text-sm leading-7 text-muted-foreground">Give your next API a clear home. Bring your endpoints, their details, and your team together in Lumen.</p>
                <Button asChild size="lg" className="mt-6 h-11 w-full justify-between gap-8 px-5 sm:w-auto">
                  <Link href="/signup">Create your account<ArrowRight className="size-4" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex w-full max-w-[100rem] flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-6 text-xs text-muted-foreground sm:px-10 lg:px-12 xl:px-16">
        <span className="font-semibold text-foreground">Lumen.</span>
        <span>A clearer home for your APIs.</span>
      </footer>
    </div>
  );
}
