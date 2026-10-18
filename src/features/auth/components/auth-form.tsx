"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  BracesIcon,
  CodeXmlIcon,
  FolderIcon,
  LayersIcon,
  LockKeyholeIcon,
  MailIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { safeCallbackPath } from "@/lib/app-url";
import { cn } from "@/lib/utils";
import { signInSchema, signUpSchema } from "@/lib/validators";

const highlights = [
  { icon: LayersIcon, title: "Stashes", body: "Group endpoints by domain, like auth or payments." },
  { icon: BracesIcon, title: "Rich routes", body: "Schemas, examples, headers, and responses in one place." },
  { icon: FolderIcon, title: "Shared projects", body: "Invite teammates with a link and set their access." },
];

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeCallbackPath(params.get("callbackUrl"));
  const [pending, setPending] = useState(false);
  const isSignup = mode === "signup";
  const form = useForm({
    resolver: zodResolver(isSignup ? signUpSchema : signInSchema),
    defaultValues: isSignup
      ? { name: "", email: "", password: "" }
      : { email: "", password: "" },
  });

  async function onSubmit(values: { name?: string; email: string; password: string }) {
    setPending(true);
    const result = isSignup
      ? await authClient.signUp.email({
          name: values.name ?? "",
          email: values.email,
          password: values.password,
          callbackURL: callbackUrl,
        })
      : await authClient.signIn.email({
          email: values.email,
          password: values.password,
          callbackURL: callbackUrl,
        });
    setPending(false);
    if (result.error) {
      const fallback = isSignup ? "Could not create account" : "Could not sign in";
      toast.error(result.error.message ?? fallback);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  const switchHref = isSignup
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="relative grid min-h-full flex-1 bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-border/50 bg-muted/20 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.85_0.17_95/0.18),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top_left,oklch(0.85_0.17_95/0.12),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[48px_48px] mask-[radial-gradient(ellipse_at_center,black_40%,transparent_75%)] opacity-[0.35] dark:opacity-[0.12]"
        />

        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <CodeXmlIcon className="size-4.5" aria-hidden />
          </span>
          <span className="text-base font-semibold tracking-tight">Lumen</span>
        </Link>

        <div className="relative flex max-w-md flex-col gap-8">
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              API documentation workspace
            </span>
            <h2 className="text-4xl leading-[1.1] font-semibold tracking-tight">
              Documentation that stays out of the way.
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              Organize endpoints into stashes, scan them in a grid or a list, and share projects
              with the people who build against them.
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            {highlights.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-4 shadow-sm backdrop-blur-sm dark:border-white/5 dark:bg-white/3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{title}</span>
                  <span className="text-xs leading-5 text-muted-foreground">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">Local-first API docs.</p>
      </aside>

      {/* Form panel */}
      <motion.main
        className="flex flex-col items-center justify-center px-4 py-12 sm:px-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="flex w-full max-w-md flex-col gap-8">
          <Link href="/" className="flex items-center gap-2.5 lg:hidden">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CodeXmlIcon className="size-4" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight">Lumen</span>
          </Link>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                {isSignup ? <UserRoundIcon className="size-5" /> : <LockKeyholeIcon className="size-5" />}
              </span>
              <div className="flex flex-col">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {isSignup ? "Create your account" : "Welcome back"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isSignup
                    ? "Start a workspace for the APIs you maintain."
                    : "Sign in to your Lumen workspace."}
                </p>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8",
              "dark:border-white/5 dark:bg-white/2 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
            )}
          >
            <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                {isSignup ? (
                  <Field data-invalid={Boolean(form.formState.errors.name) || undefined}>
                    <FieldLabel htmlFor="name" className="gap-1.5">
                      <UserRoundIcon className="size-3.5 text-muted-foreground" aria-hidden />
                      Name
                    </FieldLabel>
                    <Input
                      id="name"
                      autoComplete="name"
                      placeholder="Ada Lovelace"
                      className="h-10"
                      {...form.register("name")}
                    />
                    <FieldError errors={[form.formState.errors.name]} />
                  </Field>
                ) : null}

                <Field data-invalid={Boolean(form.formState.errors.email) || undefined}>
                  <FieldLabel htmlFor="email" className="gap-1.5">
                    <MailIcon className="size-3.5 text-muted-foreground" aria-hidden />
                    Email
                  </FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    className="h-10"
                    aria-invalid={Boolean(form.formState.errors.email)}
                    {...form.register("email")}
                  />
                  <FieldError errors={[form.formState.errors.email]} />
                </Field>

                <Field data-invalid={Boolean(form.formState.errors.password) || undefined}>
                  <FieldLabel htmlFor="password" className="gap-1.5">
                    <LockKeyholeIcon className="size-3.5 text-muted-foreground" aria-hidden />
                    Password
                  </FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    placeholder={isSignup ? "At least 8 characters" : "Your password"}
                    className="h-10"
                    aria-invalid={Boolean(form.formState.errors.password)}
                    {...form.register("password")}
                  />
                  <FieldError errors={[form.formState.errors.password]} />
                </Field>
              </FieldGroup>

              <Button type="submit" size="lg" className="h-10 w-full gap-2 shadow-sm" disabled={pending}>
                {pending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <ArrowRightIcon data-icon="inline-end" />
                )}
                {isSignup ? "Create account" : "Sign in"}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "New to Lumen?"}{" "}
            <Link
              href={switchHref}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {isSignup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </motion.main>
    </div>
  );
}
