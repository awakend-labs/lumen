"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CopyButton } from "@/components/copy-button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useInviteMember,
  useInvitations,
  useMembers,
  useRemoveMember,
  useRevokeInvitation,
  useUpdateMemberRole,
} from "@/features/members/queries";
import { formatDate } from "@/lib/format";
import { canManageProject } from "@/lib/permissions";
import type { InvitationRecord, ProjectRole } from "@/lib/types";
import { invitationInputSchema, type InvitationInput } from "@/lib/validators";

export function ProjectSettings({
  projectId,
  role,
}: {
  projectId: string;
  role: ProjectRole;
}) {
  const owner = canManageProject(role);
  const members = useMembers(projectId);
  const invitations = useInvitations(projectId, owner);
  const invite = useInviteMember(projectId);
  const revoke = useRevokeInvitation(projectId);
  const updateRole = useUpdateMemberRole(projectId);
  const remove = useRemoveMember(projectId);
  const [created, setCreated] = useState<InvitationRecord | null>(null);
  const form = useForm<InvitationInput>({
    resolver: zodResolver(invitationInputSchema),
    defaultValues: { email: "", role: "editor" },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>People who can open this project.</CardDescription>
        </CardHeader>
        <CardContent>
          {members.isLoading ? <Skeleton className="h-32 w-full" /> : null}
          {members.isError && <p role="alert" className="text-sm text-destructive">{members.error.message} <Button variant="ghost" onClick={() => members.refetch()}>Retry</Button></p>}
          {members.data ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {owner ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.data.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={member.image ?? undefined} alt="" />
                          <AvatarFallback>{member.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {owner && member.role !== "owner" ? (
                        <Select
                          value={member.role}
                          disabled={updateRole.isPending || remove.isPending}
                          onValueChange={(value) =>
                            updateRole.mutate({
                              memberId: member.id,
                              role: value as "editor" | "viewer",
                            })
                          }
                        >
                          <SelectTrigger className="w-32" size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">{member.role}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(member.createdAt)}
                    </TableCell>
                    {owner ? (
                      <TableCell className="text-right">
                        {member.role === "owner" ? null : (
                          <ConfirmDelete title="Remove collaborator?" description={`${member.name} (${member.email}) will lose access to this project. You can invite them again later.`}
                            confirmLabel="Remove collaborator" pending={remove.isPending} onConfirm={() => remove.mutate(member.id)}
                            trigger={<Button variant="ghost" size="sm" disabled={remove.isPending}>Remove</Button>} />
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      {owner ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite</CardTitle>
            <CardDescription>
              Create a link and send it yourself. Invites expire after 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form
              className="flex flex-col gap-4"
              onSubmit={form.handleSubmit((values) =>
                invite.mutate(values, {
                  onSuccess: (invitation) => {
                    setCreated(invitation);
                    form.reset({ email: "", role: values.role });
                  },
                }),
              )}
            >
              <FieldGroup>
                <div className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
                  <Field data-invalid={Boolean(form.formState.errors.email) || undefined}>
                    <FieldLabel htmlFor="invite-email">Email</FieldLabel>
                    <Input
                      id="invite-email"
                      type="email"
                      aria-invalid={Boolean(form.formState.errors.email)}
                      {...form.register("email")}
                    />
                    <FieldError errors={[form.formState.errors.email]} />
                  </Field>
                  <Field>
                    <FieldLabel>Role</FieldLabel>
                    <Select
                      value={form.watch("role")}
                      onValueChange={(value) =>
                        form.setValue("role", value as InvitationInput["role"])
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Button type="submit" disabled={invite.isPending}>
                    {invite.isPending ? <Spinner data-icon="inline-start" /> : null}
                    Create link
                  </Button>
                </div>
              </FieldGroup>
            </form>

            {created ? (
              <Alert>
                <AlertTitle>Share this link</AlertTitle>
                <AlertDescription>
                  <span className="mt-2 flex items-center gap-2">
                    <code className="truncate rounded bg-muted px-2 py-1 text-xs">{created.link}</code>
                    <CopyButton value={created.link} label="Copy invite link" />
                  </span>
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Pending invitations</h3>
              {invitations.isError ? <p role="alert" className="text-sm text-destructive">{invitations.error.message} <Button variant="ghost" onClick={() => invitations.refetch()}>Retry</Button></p> : null}
              {invitations.isLoading || ((invite.isPending || invitations.isFetching) && !invitations.data?.length) ? <Skeleton className="h-16 w-full" /> : null}
              {invitations.data && invitations.data.length === 0 && !invite.isPending && !invitations.isFetching && !invitations.isError ? (
                <p className="text-sm text-muted-foreground">No pending invitations.</p>
              ) : null}
              {invitations.data?.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div>
                    <p className="text-sm">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {invitation.role} · expires {formatDate(invitation.expiresAt)}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <CopyButton value={invitation.link} label="Copy invite link" />
                    <ConfirmDelete title="Revoke invitation?" description={`The invitation link for ${invitation.email} will stop working. You can create a new link later.`}
                      confirmLabel="Revoke invitation" pending={revoke.isPending}
                      onConfirm={() => revoke.mutate(invitation.id, { onSuccess: () => { if (created?.id === invitation.id) setCreated(null); } })}
                      trigger={<Button variant="ghost" size="sm" disabled={revoke.isPending}>Revoke</Button>} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
