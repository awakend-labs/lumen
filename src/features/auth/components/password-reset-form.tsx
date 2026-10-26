"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, ArrowRightIcon, CircleCheckIcon, EyeIcon, EyeOffIcon, LockKeyholeIcon, MailIcon } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { LumenMark } from "@/components/lumen-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { forgotPasswordSchema, resetPasswordSchema } from "../validators";

const subscribeToHydration = () => () => {};

export function PasswordResetForm({ mode, token }: { mode: "request" | "reset"; token?: string }) {
  return (
    <main className="flex min-h-svh flex-1 flex-col bg-background px-5 py-5 sm:px-10">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Lumen home"><LumenMark className="size-8" /><span className="text-base font-semibold tracking-[-0.04em]">Lumen.</span></Link>
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-[26rem]">
          <section className="auth-card rounded-md border border-border bg-card p-6 shadow-[0_8px_40px_#00000005] sm:p-8">
            <p className="eyebrow mb-3 flex items-center gap-2"><span className="h-px w-5 bg-primary" />Account security</p>
            {mode === "request" ? <RequestResetForm /> : <ChoosePasswordForm token={token} />}
          </section>
          <Link href="/login" className="mx-auto mt-6 flex w-fit items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeftIcon className="size-3.5" />Back to sign in</Link>
        </div>
      </div>
    </main>
  );
}

function RequestResetForm() {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [sent, setSent] = useState(false);
  const form = useForm({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });
  const pending = form.formState.isSubmitting;

  async function submit(values: { email: string }) {
    form.clearErrors("root");
    try {
      const result = await authClient.requestPasswordReset({ email: values.email, redirectTo: `${window.location.origin}/reset-password` });
      if (result.error) {
        form.setError("root", { message: result.error.status === 429 ? "Too many requests. Please wait a minute and try again." : "We couldn't send a reset link. Please try again shortly." });
        return;
      }
      form.reset();
      setSent(true);
    } catch {
      form.setError("root", { message: "We couldn't connect. Please try again." });
    }
  }

  if (sent) return (
    <div role="status">
      <MailIcon aria-hidden className="mb-4 size-7 text-primary" />
      <h1 className="text-2xl font-semibold tracking-[-0.04em]">Check your email<span className="text-primary">.</span></h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">If an account exists with that email, you’ll receive a password reset link shortly. Check your spam folder too. The link expires in 30 minutes.</p>
      <Button type="button" variant="outline" className="mt-5 w-full" onClick={() => setSent(false)}>Try another email</Button>
    </div>
  );

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-[-0.04em]">Forgot your password<span className="text-primary">?</span></h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Enter your account email and we’ll send you a reset link.</p>
      <form method="post" action="/forgot-password" noValidate className="mt-6" onSubmit={form.handleSubmit(submit)}>
        <fieldset disabled={!hydrated || pending} className="flex min-w-0 flex-col gap-5">
          <Field className="gap-2" data-invalid={Boolean(form.formState.errors.email) || undefined}>
            <FieldLabel htmlFor="reset-email">Email address</FieldLabel>
            <Input id="reset-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@company.com" className="h-11" aria-invalid={Boolean(form.formState.errors.email)} aria-describedby={form.formState.errors.email ? "reset-email-error" : undefined} {...form.register("email")} />
            <FieldError id="reset-email-error" errors={[form.formState.errors.email]} />
          </Field>
          {form.formState.errors.root && <p role="alert" className="text-xs leading-5 text-destructive">{form.formState.errors.root.message}</p>}
          <Button type="submit" className="h-11 w-full gap-2.5">{pending ? "Sending link…" : "Send reset link"}{pending ? <Spinner className="size-4" /> : <ArrowRightIcon aria-hidden className="size-4" />}</Button>
        </fieldset>
      </form>
    </>
  );
}

function ChoosePasswordForm({ token }: { token?: string }) {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [saved, setSaved] = useState(false);
  const [invalid, setInvalid] = useState(!token);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm({ resolver: zodResolver(resetPasswordSchema), defaultValues: { newPassword: "", confirmPassword: "" } });
  const pending = form.formState.isSubmitting;

  async function submit(values: { newPassword: string; confirmPassword: string }) {
    if (!token) return;
    form.clearErrors("root");
    try {
      const result = await authClient.resetPassword({ token, newPassword: values.newPassword });
      if (result.error) {
        if (result.error.code === "INVALID_TOKEN") { setInvalid(true); form.reset(); return; }
        form.setError("root", { message: result.error.status === 429 ? "Too many requests. Please wait a minute and try again." : "We couldn't reset your password. Please try again." });
        return;
      }
      form.reset();
      window.history.replaceState(null, "", "/reset-password");
      setSaved(true);
    } catch {
      form.setError("root", { message: "We couldn't connect. Please try again." });
    }
  }

  if (saved) return (
    <div role="status">
      <CircleCheckIcon aria-hidden className="mb-4 size-7 text-primary" />
      <h1 className="text-2xl font-semibold tracking-[-0.04em]">Password reset<span className="text-primary">.</span></h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Your password has been updated and your previous sessions have been signed out. Sign in with your new password.</p>
      <Button asChild className="mt-5 h-11 w-full"><Link href="/login">Sign in<ArrowRightIcon aria-hidden className="size-4" /></Link></Button>
    </div>
  );

  if (invalid) return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.04em]">Request a new link<span className="text-primary">.</span></h1>
      <p role="alert" className="mt-3 text-sm leading-6 text-muted-foreground">This reset link is invalid, has expired, or has already been used. Request a new link to reset your password.</p>
      <Button asChild className="mt-5 h-11 w-full"><Link href="/forgot-password">Request a new link<ArrowRightIcon aria-hidden className="size-4" /></Link></Button>
    </div>
  );

  return (
    <>
      <LockKeyholeIcon aria-hidden className="mb-4 size-7 text-primary" />
      <h1 className="text-2xl font-semibold tracking-[-0.04em]">Reset your password<span className="text-primary">.</span></h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a new password with 8 to 128 characters.</p>
      <form method="post" action="/reset-password" noValidate className="mt-6" onSubmit={form.handleSubmit(submit)}>
        <fieldset disabled={!hydrated || pending} className="flex min-w-0 flex-col gap-5">
          <FieldGroup className="gap-4">
            {(["newPassword", "confirmPassword"] as const).map(name => (
              <Field key={name} className="gap-2" data-invalid={Boolean(form.formState.errors[name]) || undefined}>
                <FieldLabel htmlFor={name}>{name === "newPassword" ? "New password" : "Confirm new password"}</FieldLabel>
                <div className="relative">
                  <Input id={name} type={showPassword ? "text" : "password"} autoComplete="new-password" maxLength={128} className="h-11 pr-11" aria-invalid={Boolean(form.formState.errors[name])} aria-describedby={form.formState.errors[name] ? `${name}-error` : undefined} {...form.register(name)} />
                  <button type="button" aria-label={showPassword ? "Hide passwords" : "Show passwords"} aria-pressed={showPassword} aria-controls="newPassword confirmPassword" onClick={() => setShowPassword(value => !value)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-sm text-muted-foreground hover:text-foreground">{showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}</button>
                </div>
                <FieldError id={`${name}-error`} errors={[form.formState.errors[name]]} />
              </Field>
            ))}
          </FieldGroup>
          {form.formState.errors.root && <p role="alert" className="text-xs leading-5 text-destructive">{form.formState.errors.root.message}</p>}
          <Button type="submit" className="h-11 w-full gap-2.5">{pending ? "Resetting password…" : "Reset password"}{pending ? <Spinner className="size-4" /> : <ArrowRightIcon aria-hidden className="size-4" />}</Button>
        </fieldset>
      </form>
    </>
  );
}
