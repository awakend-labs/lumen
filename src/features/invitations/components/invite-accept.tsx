"use client";

import { MailOpenIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useAcceptInvitation, useInvitationPreview } from "@/features/invitations/queries";
import { authClient } from "@/lib/auth-client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function InviteAccept({ token }: { token: string; }) {
  const router = useRouter();
  const preview = useInvitationPreview(token);
  const accept = useAcceptInvitation(token);
  const session = authClient.useSession();
  const client = useQueryClient();
  const [switching, setSwitching] = useState(false);
  const callback = `/invite/${token}`;
  const signedInUser = session.data?.user;
  const wrongEmail = Boolean(signedInUser && preview.data && signedInUser.email.trim().toLowerCase() !== preview.data.email.trim().toLowerCase());
  const sessionReady = !session.isPending && !session.error;

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md gap-0 overflow-hidden border-border/50 p-0 shadow-lg dark:border-white/5">
        <div className="flex flex-col items-center gap-3 border-b border-border/50 bg-muted/30 px-6 py-8 text-center dark:bg-white/2">
          <span className="flex size-12 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary shadow-sm">
            <MailOpenIcon className="size-5" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl">Project invitation</CardTitle>
            <CardDescription>Join a Lumen project with the role you were given.</CardDescription>
          </div>
        </div>
        <CardContent className="flex flex-col gap-5 px-6 py-6">
          {preview.isLoading ? <Skeleton className="h-24 w-full" /> : null}
          {preview.isError ? (
            <p className="text-sm text-muted-foreground">{preview.error.message}</p>
          ) : null}
          {preview.data ? (
            <div className="flex flex-col gap-4 text-sm">
              <div className="flex flex-col gap-1 rounded-md border border-border/50 bg-muted/20 p-4 dark:border-white/5 dark:bg-white/2">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Project</span>
                <span className="text-base font-semibold">{preview.data.projectName}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Sent to</span>
                  <span className="truncate">{preview.data.email}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Role</span>
                  <Badge variant="outline" className="w-fit gap-1.5 rounded-sm border-primary/35 bg-primary/10 capitalize">
                    <ShieldCheckIcon className="size-3 text-primary" aria-hidden />
                    {preview.data.role}
                  </Badge>
                </div>
              </div>
              {preview.data.status !== "pending" ? (
                <p className="text-muted-foreground">
                  This invitation is {preview.data.status}.
                </p>
              ) : null}
              {sessionReady && wrongEmail && <p role="alert" className="rounded-md border border-border bg-muted/30 p-3 text-sm leading-6">This invitation is for <strong className="break-all">{preview.data.email}</strong>. You’re signed in as <span className="break-all">{signedInUser?.email}</span>. Use the invited account to continue.</p>}
              {session.error && <p role="alert" className="text-sm text-destructive">We couldn’t verify your account. Reload this page to try again.</p>}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2 border-t border-border/50 bg-muted/20 px-6 py-5 dark:border-white/5">
          {preview.data && session.isPending && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />Checking your account…</p>}
          {preview.data && ["pending", "accepted"].includes(preview.data.status) && sessionReady && !signedInUser ? (
            <Button asChild>
              <Link href={`/login?callbackUrl=${encodeURIComponent(callback)}`}>
                {preview.data.status === "accepted" ? "Sign in to open project" : "Sign in to accept"}
              </Link>
            </Button>
          ) : null}
          {preview.data?.status === "pending" && sessionReady && signedInUser && !wrongEmail ? (
            <Button
              disabled={accept.isPending}
              onClick={() =>
                accept.mutate(undefined, {
                  onSuccess: () => {
                    toast.success("You joined the project");
                  },
                  onError: (error) => toast.error(error.message),
                })
              }
            >
              {accept.isPending ? <Spinner data-icon="inline-start" /> : null}
              Accept invitation
            </Button>
          ) : null}
          {sessionReady && wrongEmail && <Button variant="outline" disabled={switching} onClick={async () => {
            setSwitching(true);
            try {
              const result = await authClient.signOut();
              if (result.error) throw new Error(result.error.message ?? "Could not sign out");
              client.clear();
              router.replace(`/login?callbackUrl=${encodeURIComponent(callback)}`);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not switch accounts");
              setSwitching(false);
            }
          }}>{switching ? <Spinner /> : null}Use the invited account</Button>}
          {accept.isError && <p role="alert" className="text-sm text-destructive">{accept.error.message}</p>}
          {preview.data?.status === "accepted" && sessionReady && signedInUser && !wrongEmail ? (
            <Button asChild variant="outline">
              <Link href={`/projects/${preview.data.projectId}`}>Open project</Link>
            </Button>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
}
