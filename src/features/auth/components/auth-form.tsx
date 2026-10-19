"use client";

import { LumenMark } from "@/components/lumen-mark";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
  BracesIcon,
  CircleCheckIcon,
  LockKeyholeIcon,
  MailIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { safeCallbackPath } from "@/lib/app-url";
import { ThemeToggle } from "@/components/theme-toggle";
import { signInSchema, signUpSchema } from "@/lib/validators";

export function AuthForm({ mode }: { mode: "login" | "signup"; }) {
  const params = useSearchParams();
  const callbackUrl = safeCallbackPath(params.get("callbackUrl"));
  const [pending, setPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const isSignup = mode === "signup";
  const form = useForm({
    resolver: zodResolver(isSignup ? signUpSchema : signInSchema),
    defaultValues: isSignup
      ? { name: "", email: "", password: "" }
      : { email: "", password: "" },
  });

  async function onSubmit(values: { name?: string; email: string; password: string; }) {
    setPending(true);
    setAuthError("");
    try {
      const result = isSignup
        ? await authClient.signUp.email({ name: values.name ?? "", email: values.email, password: values.password, callbackURL: callbackUrl })
        : await authClient.signIn.email({ email: values.email, password: values.password, callbackURL: callbackUrl });
      if (result.error) {
        setAuthError(result.error.message ?? (isSignup ? "Could not create account" : "Could not sign in"));
        return;
      }
      window.location.replace(callbackUrl);
    } catch {
      setAuthError("We couldn't connect. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const switchHref = isSignup
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="grid min-h-svh flex-1 bg-background lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)]">
      <aside className="auth-brand-panel relative hidden flex-col justify-between overflow-hidden border-r border-border p-9 lg:flex xl:px-14">
        <Link href="/" className="relative flex w-fit items-center gap-3" aria-label="Lumen home">
          <LumenMark /><span className="text-xl font-semibold tracking-[-0.04em]">Lumen.</span>
        </Link>
        <div className="relative my-8 w-full max-w-md self-center">
          <p className="eyebrow mb-5 flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary" />A shared source of clarity</p>
          <h2 className="text-[clamp(2.75rem,4.1vw,4rem)] leading-[1.04] font-semibold tracking-[-0.06em]">Less guesswork.<br />More good work<span className="text-primary">.</span></h2>
          <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">A considered home for your APIs, and the people who build with them.</p>
          <figure aria-label="Example endpoint documentation" className="auth-doc-preview mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_40px_#00000006]">
            <figcaption className="flex items-center justify-between border-b border-border px-5 py-3"><span className="eyebrow text-[9px]">Commerce API / Products</span><BracesIcon className="size-3.5 text-muted-foreground" /></figcaption>
            <div className="px-5 py-5"><div className="flex items-center gap-3"><span className="rounded-md bg-method-get/10 px-2 py-1 font-mono text-[10px] font-semibold text-method-get">GET</span><code className="font-mono text-xs">/v1/products</code><span className="ml-auto flex items-center gap-1 text-[10px] text-stash-green"><CircleCheckIcon className="size-3" />200</span></div><p className="mt-3 text-xs text-muted-foreground">Every route. Every detail. All in one place.</p></div>
            <div className="flex items-center gap-5 border-t border-border px-5 py-3 font-mono text-[9px] text-muted-foreground"><span>Headers</span><span>Parameters</span><span>Responses</span></div>
          </figure>
        </div>
        <div className="relative flex items-center justify-between gap-4 border-t border-border pt-4 text-[11px] text-muted-foreground"><span>Built for shared understanding.</span><span className="font-mono text-[9px]">LUMEN / API WORKSPACE</span></div>
      </aside>

      <main className="auth-form-panel relative flex min-w-0 flex-col px-5 py-5 sm:px-10 lg:px-12">
        <header className="flex w-full items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground"><span className="lg:hidden"><LumenMark className="size-8" /></span><ArrowLeftIcon className="hidden size-3.5 lg:block" /><span className="hidden lg:inline">Back to Lumen</span><span className="text-base font-semibold text-foreground lg:hidden">Lumen.</span></Link>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col items-center justify-center py-6 sm:py-8 lg:py-4">
          <div className="w-full max-w-[26rem]">
            <div className="auth-card rounded-3xl border border-border bg-card p-6 shadow-[0_8px_40px_#00000005] sm:p-8">
              <div className="mb-6">
                <p className="eyebrow mb-3 flex items-center gap-2"><span className="h-px w-5 bg-primary" />{isSignup ? "Your next chapter" : "Your workspace awaits"}</p>
                <h1 className="text-[1.875rem] leading-tight font-semibold tracking-[-0.05em]">{isSignup ? "Create your account" : "Welcome back"}<span className="text-primary">.</span></h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{isSignup ? "Make room for the APIs you’re building." : "A little clarity is one sign-in away."}</p>
              </div>
              <form method="post" action={`/api/auth/form-unavailable?mode=${mode}`} className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
                <fieldset disabled={!hydrated || pending} className="flex min-w-0 flex-col gap-5">
                <FieldGroup className="gap-4">
                  {isSignup && <Field data-invalid={Boolean(form.formState.errors.name) || undefined} className="gap-2">
                    <FieldLabel htmlFor="name" className="text-xs font-medium">Full name</FieldLabel>
                    <div className="relative"><UserRoundIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/70" /><Input id="name" autoComplete="name" placeholder="Ada Lovelace" className="h-11 bg-background/60 pl-10 dark:bg-background/35" disabled={pending} aria-invalid={Boolean(form.formState.errors.name)} {...form.register("name")} /></div>
                    <FieldError errors={[form.formState.errors.name]} />
                  </Field>}
                  <Field data-invalid={Boolean(form.formState.errors.email) || undefined} className="gap-2">
                    <FieldLabel htmlFor="email" className="text-xs font-medium">Email address</FieldLabel>
                    <div className="relative"><MailIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/70" /><Input id="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@company.com" className="h-11 bg-background/60 pl-10 dark:bg-background/35" disabled={pending} aria-invalid={Boolean(form.formState.errors.email)} {...form.register("email")} /></div>
                    <FieldError errors={[form.formState.errors.email]} />
                  </Field>
                  <Field data-invalid={Boolean(form.formState.errors.password) || undefined} className="gap-2">
                    <FieldLabel htmlFor="password" className="text-xs font-medium">Password</FieldLabel>
                    <div className="relative"><LockKeyholeIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/70" /><Input id="password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} placeholder={isSignup ? "At least 8 characters" : "Enter your password"} className="h-11 bg-background/60 pr-11 pl-10 dark:bg-background/35" disabled={pending} aria-invalid={Boolean(form.formState.errors.password)} {...form.register("password")} /><button type="button" className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} aria-controls="password" onClick={() => setShowPassword(value => !value)} disabled={pending}>{showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}</button></div>
                    <FieldError errors={[form.formState.errors.password]} />
                  </Field>
                </FieldGroup>
                {authError && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs leading-5 text-destructive">{authError}</p>}
                <Button type="submit" size="lg" className="h-11 w-full justify-between px-4" disabled={pending}><span>{pending ? (isSignup ? "Creating account…" : "Signing in…") : (isSignup ? "Create account" : "Sign in")}</span>{pending ? <Spinner /> : <ArrowRightIcon className="size-4" />}</Button>
                </fieldset>
              </form>
            </div>
            <p className="mt-6 text-center text-xs leading-6 text-muted-foreground">{isSignup ? "Already have an account?" : "New to Lumen?"}{" "}<Link href={switchHref} className="inline-flex items-center gap-1 font-medium text-foreground underline decoration-primary/70 decoration-2 underline-offset-4 hover:decoration-primary">{isSignup ? "Sign in" : "Create an account"}<ArrowRightIcon className="size-3" /></Link></p>
          </div>
        </div>
        <p className="text-center text-[10px] tracking-wide text-muted-foreground/70">Your APIs. Your team. One clear workspace.</p>
      </main>
    </div>
  );
}
