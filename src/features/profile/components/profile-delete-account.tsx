"use client";

import { Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export function ProfileDeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);

  function changeOpen(next: boolean) {
    if (submitting.current) return;
    setOpen(next);
    setPassword("");
    setError("");
  }

  async function deleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !password) return;
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      const result = await authClient.deleteUser({ password });
      if (result.error) {
        setError(result.error.code === "INVALID_PASSWORD"
          ? "Your current password is incorrect."
          : result.error.message ?? "Could not delete your account. Please try again.");
        return;
      }
      // A full navigation also discards cached workspace data after deletion.
      window.location.replace("/login");
    } catch {
      setError("Couldn't connect. Please try again.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="profile-delete-heading" className="grid gap-5 border-t border-border px-5 py-7 sm:px-7 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-8">
      <div>
        <Trash2Icon className="mb-3 size-4 text-muted-foreground" aria-hidden />
        <h2 id="profile-delete-heading" className="text-sm font-semibold">Delete account</h2>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">Permanently delete your Lumen account.</p>
      </div>
      <div className="flex min-w-0 flex-col items-start gap-4">
        <p className="text-xs leading-5 text-muted-foreground">Your account, preferences, and all projects you own will be permanently deleted, including their stashes and endpoints. This cannot be undone.</p>
        <AlertDialog open={open} onOpenChange={changeOpen}>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" size="sm">Delete account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent onEscapeKeyDown={(event) => { if (submitting.current) event.preventDefault(); }}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account permanently?</AlertDialogTitle>
              <AlertDialogDescription>Your account, preferences, and all projects you own will be deleted permanently. Collaborators will also lose access to those projects. Projects owned by others will remain, but your memberships will be removed. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <form method="post" action="/profile" onSubmit={deleteAccount} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="delete-account-password">Current password</Label>
                <Input id="delete-account-password" name="password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} disabled={pending} aria-invalid={Boolean(error)} aria-describedby={error ? "delete-account-error" : undefined} />
                {error && <p id="delete-account-error" role="alert" className="text-xs text-destructive">{error}</p>}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                <Button type="submit" variant="destructive" disabled={pending || !password}>
                  {pending && <Spinner data-icon="inline-start" />}{pending ? "Deleting account…" : "Delete account"}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
