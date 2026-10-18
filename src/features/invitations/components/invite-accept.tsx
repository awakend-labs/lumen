"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useAcceptInvitation, useInvitationPreview } from "@/features/invitations/queries";
import { authClient } from "@/lib/auth-client";

export function InviteAccept({ token }: { token: string }) {
  const router = useRouter();
  const preview = useInvitationPreview(token);
  const accept = useAcceptInvitation(token);
  const session = authClient.useSession();
  const callback = `/invite/${token}`;

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Project invitation</CardTitle>
          <CardDescription>Join a Lumen project with the role you were given.</CardDescription>
        </CardHeader>
        <CardContent>
          {preview.isLoading ? <Skeleton className="h-24 w-full" /> : null}
          {preview.isError ? (
            <p className="text-sm text-muted-foreground">{preview.error.message}</p>
          ) : null}
          {preview.data ? (
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <span className="text-muted-foreground">Project</span>
                <span className="mt-1 block text-base font-medium">{preview.data.projectName}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Sent to</span>
                <span className="mt-1 block">{preview.data.email}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Role</span>
                <span className="mt-1 block capitalize">{preview.data.role}</span>
              </p>
              {preview.data.status !== "pending" ? (
                <p className="text-muted-foreground">
                  This invitation is {preview.data.status}.
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2">
          {preview.data?.status === "pending" && !session.data ? (
            <Button asChild>
              <Link href={`/login?callbackUrl=${encodeURIComponent(callback)}`}>
                Sign in to accept
              </Link>
            </Button>
          ) : null}
          {preview.data?.status === "pending" && session.data ? (
            <Button
              disabled={accept.isPending}
              onClick={() =>
                accept.mutate(undefined, {
                  onSuccess: (result) => {
                    toast.success("You joined the project");
                    router.push(`/projects/${result.projectId}`);
                  },
                  onError: (error) => toast.error(error.message),
                })
              }
            >
              {accept.isPending ? <Spinner data-icon="inline-start" /> : null}
              Accept invitation
            </Button>
          ) : null}
          {preview.data?.status === "accepted" ? (
            <Button asChild variant="outline">
              <Link href={`/projects/${preview.data.projectId}`}>Open project</Link>
            </Button>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
}
