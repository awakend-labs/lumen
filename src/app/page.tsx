import { LumenMark } from "@/components/lumen-mark";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, Braces, FolderOpen, Layers, ListTree, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProductPreview } from "@/components/product-preview";

const features = [
  { number: "01", icon: Layers, title: "Structure without the clutter.", body: "Organize endpoints into stashes and optional API groups. Give every route a place that makes sense." },
  { number: "02", icon: Braces, title: "Every detail, in focus.", body: "Parameters, authentication, schemas, and responses. The full picture, clearly documented." },
  { number: "03", icon: Users, title: "The same page. Finally.", body: "Share a project invitation link. Give teammates the right access to view or edit." },
];

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="mx-auto flex w-full max-w-[100rem] flex-wrap items-center justify-between gap-3 px-5 py-6 sm:px-10 lg:px-12 xl:px-16">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Lumen home">
          <LumenMark />
          <span className="text-xl font-semibold tracking-[-0.04em]">Lumen.</span>
        </Link>
        <nav aria-label="Main navigation" className="ml-auto flex items-center gap-1 sm:gap-3">
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
        <section className="mx-auto grid max-w-[100rem] gap-10 px-5 pt-10 pb-12 sm:px-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-10 lg:px-12 xl:px-16 lg:pt-12 lg:pb-16">
          <div>
            <p className="eyebrow flex items-center gap-2.5">
              <span className="size-1.5 bg-primary" />The API documentation workspace</p>
            <h1 className="mt-5 text-[clamp(2.5rem,4.4vw,4rem)] leading-[1.08] font-semibold tracking-[-0.05em]">Bring your APIs<br />
              <span className="relative inline-block">into the light.<span aria-hidden className="absolute -bottom-1.5 left-0 h-[3px] w-full bg-primary" />
              </span>
            </h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-muted-foreground">A home for the details that matter. Organize your endpoints, document with precision, and give your team a clearer way to build.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="px-6">
                <Link href="/signup">Start documenting<ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <a href="#details" className="mt-7 inline-flex items-center gap-3 text-xs text-muted-foreground hover:text-foreground">
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
          <div className="mx-auto grid max-w-[100rem] gap-8 px-5 py-10 sm:px-10 md:grid-cols-3 lg:px-12 xl:px-16 lg:py-12">{features.map(({ number, icon: Icon, title, body }) =>
            <article key={number} className="border-t border-border pt-5">
              <div className="mb-5 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">/ {number}</span>
                <Icon className="size-5 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">{body}</p>
            </article>)}</div>
        </section>
        <section aria-labelledby="get-started-heading" className="mx-auto max-w-[100rem] px-5 py-10 sm:px-10 lg:px-12 lg:py-12 xl:px-16">
          <div className="overflow-hidden rounded-3xl border border-border bg-card" style={{ backgroundImage: "var(--surface-gradient)" }}>
            <div className="grid items-center gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_1fr] lg:gap-12 lg:p-10">
              <div className="min-w-0">
                <p className="eyebrow mb-4 flex items-center gap-2.5"><span className="size-1.5 rounded-full bg-primary" />Inside your Lumen workspace</p>
                <h2 id="get-started-heading" className="max-w-md text-[clamp(1.75rem,2.5vw,2.5rem)] leading-[1.15] font-semibold tracking-[-0.04em]">A place for every route.<br /><span className="text-muted-foreground">Context for every detail.</span></h2>
                <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">Lumen brings your API documentation into one shared workspace, from the project structure to the fields in a response.</p>
                <dl className="mt-6 grid gap-4">
                  {[
                    { title: "Projects", detail: "A dedicated home for each app or service." },
                    { title: "API stashes", detail: "Keep related routes together, like auth, users, or payments." },
                    { title: "Optional API groups", detail: "Add another level of organization inside a stash. Leave other endpoints ungrouped." },
                  ].map(({ title, detail }, index) => <div key={title} className="flex gap-3">
                    <span aria-hidden className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-[10px] text-primary">0{index + 1}</span>
                    <div><dt className="text-sm font-medium">{title}</dt><dd className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</dd></div>
                  </div>)}
                </dl>
              </div>
              <div aria-label="Example project with a stash, API groups, and endpoints" className="min-w-0 overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
                  <span className="text-xs font-medium">One project. A clear structure.</span><span className="font-mono text-[10px] text-muted-foreground">EXAMPLE</span>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-2.5 text-sm font-semibold"><FolderOpen className="size-4 text-primary" />Snipful<span className="ml-auto text-[10px] font-normal text-muted-foreground">Project</span></div>
                  <div className="mt-3 ml-2 border-l border-border pl-4">
                    <div className="flex items-center gap-2 text-sm font-medium"><Layers className="size-3.5 text-muted-foreground" />Better Auth<span className="ml-auto text-[10px] font-normal text-muted-foreground">API stash</span></div>
                    <div className="mt-4 space-y-4 border-l border-border pl-4">
                      <div>
                        <p className="flex items-center gap-2 text-xs font-medium"><ListTree className="size-3.5 text-primary" />Email Authentication</p>
                        <div className="mt-2 space-y-1.5">
                          {[{ method: "POST", name: "Sign Up", path: "/auth/sign-up" }, { method: "POST", name: "Sign In", path: "/auth/sign-in" }].map(route => <div key={route.path} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border/70 bg-card px-3 py-2">
                            <span className="rounded bg-method-post/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-method-post">{route.method}</span>
                            <span className="text-xs font-medium">{route.name}</span><span className="ml-auto font-mono text-[10px] text-muted-foreground">{route.path}</span>
                          </div>)}
                        </div>
                      </div>
                      <div><p className="flex items-center gap-2 text-xs font-medium"><ListTree className="size-3.5 text-primary" />Session Management</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border/70 bg-card px-3 py-2"><span className="rounded bg-method-get/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-method-get">GET</span><span className="text-xs font-medium">Current Session</span><span className="ml-auto font-mono text-[10px] text-muted-foreground">/auth/session</span></div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 border-t border-border pt-3 text-[11px] leading-5 text-muted-foreground">Use groups when they help. Your stash works just as well without them.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start justify-between gap-4 border-t border-border bg-background/40 px-6 py-5 sm:flex-row sm:items-center sm:px-8 lg:px-10">
              <div><p className="text-sm font-semibold">Give your next API a clear home.</p><p className="mt-1 text-xs text-muted-foreground">Create a project, add a stash, and document your first endpoint.</p></div>
              <Button asChild className="h-10 w-full gap-5 px-5 sm:w-auto"><Link href="/signup">Create your account<ArrowRight className="size-4" /></Link></Button>
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
