"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, CheckIcon, LockKeyholeIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { ProfileThemeSettings } from "./profile-theme-settings";
import {
  profileNameSchema,
  profilePasswordSchema,
  type ProfileNameInput,
  type ProfilePasswordInput,
} from "../validators";

const emptyPasswords = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ProfileSettings({ user }: { user: { name: string; email: string; image?: string | null } }) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [savedName, setSavedName] = useState(user.name);
  const [nameSaved, setNameSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  useEffect(() => setHydrated(true), []);

  const nameForm = useForm<ProfileNameInput>({
    resolver: zodResolver(profileNameSchema),
    defaultValues: { name: user.name },
  });
  const passwordForm = useForm<ProfilePasswordInput>({
    resolver: zodResolver(profilePasswordSchema),
    defaultValues: emptyPasswords,
  });

  async function saveName(values: ProfileNameInput) {
    setNameSaved(false);
    nameForm.clearErrors("root");
    try {
      const result = await authClient.updateUser({ name: values.name });
      if (result.error) {
        nameForm.setError("root", { message: result.error.message ?? "Could not update your name. Please try again." });
        return;
      }
      setSavedName(values.name);
      nameForm.reset(values);
      setNameSaved(true);
      router.refresh();
    } catch {
      nameForm.setError("root", { message: "Couldn't connect. Please try again." });
    }
  }

  async function savePassword(values: ProfilePasswordInput) {
    setPasswordSaved(false);
    passwordForm.clearErrors("root");
    try {
      const result = await authClient.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      if (result.error) {
        if (result.error.code === "INVALID_PASSWORD") {
          passwordForm.setError("currentPassword", { message: "Your current password is incorrect." }, { shouldFocus: true });
        } else {
          passwordForm.setError("root", { message: result.error.message ?? "Could not change your password. Please try again." });
        }
        return;
      }
      passwordForm.reset(emptyPasswords);
      setPasswordSaved(true);
    } catch {
      passwordForm.setError("root", { message: "Couldn't connect. Please try again." });
    }
  }

  return (
    <div className="lumen-page">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-7">
        <header>
          <Link href="/dashboard" className="mb-7 inline-flex min-h-8 items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeftIcon className="size-3.5" aria-hidden />Back to projects
          </Link>
          <p className="eyebrow mb-3 flex items-center gap-2"><span className="h-px w-5 bg-primary" aria-hidden />Your account</p>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Profile<span className="text-primary">.</span></h1>
          <p className="mt-2 text-sm text-muted-foreground">A few personal details. Always up to date.</p>
        </header>

        <div className="min-w-0 overflow-hidden rounded-md border border-border bg-card">
          <div className="flex items-center gap-4 px-5 py-6 sm:px-7">
            <Avatar className="size-12 shrink-0 rounded-md">
              <AvatarImage src={user.image ?? undefined} alt="" className="rounded-md" />
              <AvatarFallback className="rounded-md bg-primary/15 text-lg font-semibold text-accent-foreground">{savedName.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="break-words text-base font-semibold tracking-tight [overflow-wrap:anywhere]">{savedName}</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <section aria-labelledby="profile-name-heading" className="grid gap-5 border-t border-border px-5 py-7 sm:px-7 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-8">
            <div>
              <UserRoundIcon className="mb-3 size-4 text-muted-foreground" aria-hidden />
              <h2 id="profile-name-heading" className="text-sm font-semibold">Your name</h2>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">How you appear to people in your projects.</p>
            </div>
            <form method="post" action="/profile" noValidate onSubmit={nameForm.handleSubmit(saveName)} onChange={() => setNameSaved(false)}>
              <fieldset disabled={!hydrated || nameForm.formState.isSubmitting} className="flex min-w-0 flex-col gap-4">
                <Field data-invalid={Boolean(nameForm.formState.errors.name) || undefined}>
                  <FieldLabel htmlFor="profile-name">Full name</FieldLabel>
                  <Input id="profile-name" autoComplete="name" maxLength={80} className="h-10 bg-background/50" aria-invalid={Boolean(nameForm.formState.errors.name)} aria-describedby={nameForm.formState.errors.name ? "profile-name-error" : undefined} {...nameForm.register("name")} />
                  <FieldError id="profile-name-error" errors={[nameForm.formState.errors.name]} />
                </Field>
                {nameForm.formState.errors.root && <p role="alert" className="text-xs text-destructive">{nameForm.formState.errors.root.message}</p>}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <SaveFeedback visible={nameSaved}>Name updated.</SaveFeedback>
                  <Button type="submit" size="sm" className="ml-auto" disabled={!nameForm.formState.isDirty || nameForm.formState.isSubmitting}>
                    {nameForm.formState.isSubmitting && <Spinner data-icon="inline-start" />}Save name
                  </Button>
                </div>
              </fieldset>
            </form>
          </section>

          <ProfileThemeSettings />

          <section aria-labelledby="profile-password-heading" className="grid gap-5 border-t border-border px-5 py-7 sm:px-7 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-8">
            <div>
              <LockKeyholeIcon className="mb-3 size-4 text-muted-foreground" aria-hidden />
              <h2 id="profile-password-heading" className="text-sm font-semibold">Password</h2>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">Confirm your current password to choose a new one.</p>
            </div>
            <form method="post" action="/profile" noValidate onSubmit={passwordForm.handleSubmit(savePassword)} onChange={() => setPasswordSaved(false)}>
              <fieldset disabled={!hydrated || passwordForm.formState.isSubmitting} className="flex min-w-0 flex-col gap-4">
                <Field data-invalid={Boolean(passwordForm.formState.errors.currentPassword) || undefined}>
                  <FieldLabel htmlFor="profile-current-password">Current password</FieldLabel>
                  <Input id="profile-current-password" type="password" autoComplete="current-password" maxLength={128} className="h-10 bg-background/50" aria-invalid={Boolean(passwordForm.formState.errors.currentPassword)} aria-describedby={passwordForm.formState.errors.currentPassword ? "profile-current-password-error" : undefined} {...passwordForm.register("currentPassword")} />
                  <FieldError id="profile-current-password-error" errors={[passwordForm.formState.errors.currentPassword]} />
                </Field>
                <Field data-invalid={Boolean(passwordForm.formState.errors.newPassword) || undefined}>
                  <FieldLabel htmlFor="profile-new-password">New password</FieldLabel>
                  <Input id="profile-new-password" type="password" autoComplete="new-password" maxLength={128} className="h-10 bg-background/50" aria-invalid={Boolean(passwordForm.formState.errors.newPassword)} aria-describedby={`profile-password-hint${passwordForm.formState.errors.newPassword ? " profile-new-password-error" : ""}`} {...passwordForm.register("newPassword")} />
                  <p id="profile-password-hint" className="text-xs text-muted-foreground">Use at least 8 characters.</p>
                  <FieldError id="profile-new-password-error" errors={[passwordForm.formState.errors.newPassword]} />
                </Field>
                <Field data-invalid={Boolean(passwordForm.formState.errors.confirmPassword) || undefined}>
                  <FieldLabel htmlFor="profile-confirm-password">Confirm new password</FieldLabel>
                  <Input id="profile-confirm-password" type="password" autoComplete="new-password" maxLength={128} className="h-10 bg-background/50" aria-invalid={Boolean(passwordForm.formState.errors.confirmPassword)} aria-describedby={passwordForm.formState.errors.confirmPassword ? "profile-confirm-password-error" : undefined} {...passwordForm.register("confirmPassword")} />
                  <FieldError id="profile-confirm-password-error" errors={[passwordForm.formState.errors.confirmPassword]} />
                </Field>
                {passwordForm.formState.errors.root && <p role="alert" className="text-xs text-destructive">{passwordForm.formState.errors.root.message}</p>}
                <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                  <SaveFeedback visible={passwordSaved}>Password changed.</SaveFeedback>
                  <Button type="submit" variant="outline" size="sm" className="ml-auto" disabled={passwordForm.formState.isSubmitting}>
                    {passwordForm.formState.isSubmitting && <Spinner data-icon="inline-start" />}Change password
                  </Button>
                </div>
              </fieldset>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

function SaveFeedback({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return <p role="status" aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-xs text-muted-foreground">{visible && <><CheckIcon className="size-3.5 text-accent-foreground" aria-hidden />{children}</>}</p>;
}
