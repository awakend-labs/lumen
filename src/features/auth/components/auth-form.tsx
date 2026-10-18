"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
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
import { signInSchema, signUpSchema } from "@/lib/validators";

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
      toast.error(result.error.message ?? "Could not sign in");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-muted p-10 lg:flex">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            L
          </span>
          Lumen
        </Link>
        <div className="max-w-sm">
          <p className="text-2xl font-semibold tracking-tight">
            Documentation that stays out of the way.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Group endpoints into stashes, scan them in a grid or a list, and share a project with the people who need it.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Local-first API docs.</p>
      </div>
      <motion.div
        className="flex items-center justify-center px-4 py-16"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {isSignup ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignup
                ? "Start a workspace for the APIs you maintain."
                : "Sign in to your Lumen workspace."}
            </p>
          </div>
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {isSignup ? (
                <Field data-invalid={Boolean(form.formState.errors.name) || undefined}>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input id="name" autoComplete="name" {...form.register("name")} />
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>
              ) : null}
              <Field data-invalid={Boolean(form.formState.errors.email) || undefined}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(form.formState.errors.email)}
                  {...form.register("email")}
                />
                <FieldError errors={[form.formState.errors.email]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.password) || undefined}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  aria-invalid={Boolean(form.formState.errors.password)}
                  {...form.register("password")}
                />
                <FieldError errors={[form.formState.errors.password]} />
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "New to Lumen?"}{" "}
            <Link
              href={
                isSignup
                  ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
                  : `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`
              }
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {isSignup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
