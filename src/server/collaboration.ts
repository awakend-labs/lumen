import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invitations, projectMembers, projects, user } from "@/db/schema";
import { appUrl } from "@/lib/app-url";
import type { InvitationPreview, InvitationRecord, MemberRecord } from "@/lib/types";
import type { InvitationInput } from "@/lib/validators";
import { requireEditor, requireOwner } from "./access";
import { HttpError } from "./http";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function inviteLink(token: string) {
  return `${appUrl()}/invite/${token}`;
}

async function expireIfNeeded(invite: typeof invitations.$inferSelect) {
  if (invite.status === "pending" && invite.expiresAt.getTime() <= Date.now()) {
    // Derive expiration without a preview request racing an acceptance update.
    return { ...invite, status: "expired" as const };
  }
  return invite;
}

export async function listMembers(
  userId: string,
  projectId: string,
): Promise<MemberRecord[]> {
  await requireEditor(userId, projectId);
  const rows = await db
    .select({
      id: projectMembers.id,
      userId: projectMembers.userId,
      role: projectMembers.role,
      createdAt: projectMembers.createdAt,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(projectMembers)
    .innerJoin(user, eq(user.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, projectId));

  const rank = { owner: 0, editor: 1, viewer: 2 };
  return rows
    .map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }))
    .sort((a, b) => rank[a.role] - rank[b.role] || a.name.localeCompare(b.name));
}

export async function updateMemberRole(
  userId: string,
  projectId: string,
  memberId: string,
  role: "editor" | "viewer",
) {
  await requireOwner(userId, projectId);
  const [member] = await db
    .select()
    .from(projectMembers)
    .where(
      and(eq(projectMembers.id, memberId), eq(projectMembers.projectId, projectId)),
    )
    .limit(1);
  if (!member) throw new HttpError(404, "Member not found");
  if (member.role === "owner") {
    throw new HttpError(400, "The owner role can't be changed");
  }
  await db
    .update(projectMembers)
    .set({ role })
    .where(eq(projectMembers.id, memberId));
}

export async function removeMember(
  userId: string,
  projectId: string,
  memberId: string,
) {
  await requireOwner(userId, projectId);
  const [member] = await db
    .select()
    .from(projectMembers)
    .where(
      and(eq(projectMembers.id, memberId), eq(projectMembers.projectId, projectId)),
    )
    .limit(1);
  if (!member) throw new HttpError(404, "Member not found");
  if (member.role === "owner") {
    throw new HttpError(400, "The project owner can't be removed");
  }
  await db.delete(projectMembers).where(eq(projectMembers.id, memberId));
}

export async function listInvitations(
  userId: string,
  projectId: string,
): Promise<InvitationRecord[]> {
  await requireOwner(userId, projectId);
  const rows = await db
    .select()
    .from(invitations)
    .where(eq(invitations.projectId, projectId));

  const visible = [];
  for (const row of rows) {
    const current = await expireIfNeeded(row);
    if (current.status === "pending") {
      visible.push(current);
    }
  }

  return visible.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    link: inviteLink(row.token),
  }));
}

export async function createInvitation(
  userId: string,
  projectId: string,
  input: InvitationInput,
) {
  await requireOwner(userId, projectId);
  const email = input.email.trim().toLowerCase();

  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.email}) = ${email}`)
    .limit(1);

  if (existingUser) {
    const [member] = await db
      .select({ id: projectMembers.id })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, existingUser.id),
        ),
      )
      .limit(1);
    if (member) {
      throw new HttpError(409, "That person is already in this project");
    }
  }

  const [pending] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.projectId, projectId),
        eq(invitations.email, email),
        eq(invitations.status, "pending"),
      ),
    )
    .limit(1);

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  if (pending) {
    const [updated] = await db
      .update(invitations)
      .set({ role: input.role, token, expiresAt })
      .where(eq(invitations.id, pending.id))
      .returning();
    if (!updated) throw new HttpError(500, "Could not create the invitation");
    return {
      id: updated.id,
      email: updated.email,
      role: input.role,
      status: updated.status,
      expiresAt: updated.expiresAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      link: inviteLink(updated.token),
    } satisfies InvitationRecord;
  }

  const [created] = await db
    .insert(invitations)
    .values({
      projectId,
      email,
      role: input.role,
      token,
      expiresAt,
    })
    .returning();
  if (!created) throw new HttpError(500, "Could not create the invitation");
  return {
    id: created.id,
    email: created.email,
    role: input.role,
    status: created.status,
    expiresAt: created.expiresAt.toISOString(),
    createdAt: created.createdAt.toISOString(),
    link: inviteLink(created.token),
  } satisfies InvitationRecord;
}

export async function revokeInvitation(
  userId: string,
  projectId: string,
  invitationId: string,
) {
  await requireOwner(userId, projectId);
  const [existing] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.projectId, projectId),
      ),
    )
    .limit(1);
  if (!existing) throw new HttpError(404, "Invitation not found");
  await db.delete(invitations).where(eq(invitations.id, invitationId));
}

export async function previewInvitation(token: string): Promise<InvitationPreview> {
  const [invite] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);
  if (!invite) throw new HttpError(404, "Invitation not found");
  const current = await expireIfNeeded(invite);
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.id, current.projectId))
    .limit(1);
  if (!project) throw new HttpError(404, "Invitation not found");
  return {
    projectId: project.id,
    projectName: project.name,
    email: current.email,
    role: current.role,
    status: current.status,
    expiresAt: current.expiresAt.toISOString(),
  };
}

export async function acceptInvitation(
  user: { id: string; email: string },
  token: string,
) {
  const [invite] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);
  if (!invite) throw new HttpError(404, "Invitation not found");
  const current = await expireIfNeeded(invite);
  if (current.email.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
    throw new HttpError(
      403,
      "This invitation was sent to a different email address",
    );
  }
  if (current.status === "expired") {
    throw new HttpError(400, "This invitation has expired");
  }
  if (current.status === "pending") {
    // Claim the current token and insert membership in one atomic SQL statement.
    // Revoked, replaced, expired, or concurrently accepted tokens cannot grant access.
    const result = await db.execute(sql`
      with claimed as (
        update invitations set status = 'accepted'
        where id = ${current.id} and token = ${token} and status = 'pending'
          and expires_at > now() and lower(email) = ${user.email.trim().toLowerCase()}
        returning project_id, role
      ), membership as (
        insert into project_members (project_id, user_id, role, invited_by)
        select project_id, ${user.id}, role, null from claimed
        on conflict (project_id, user_id) do nothing
        returning project_id
      )
      select project_id as "projectId" from claimed
    `);
    const joined = result.rows[0];
    if (joined && typeof joined.projectId === "string") return { projectId: joined.projectId };
  }
  // A retried accept succeeds for an existing member, but never re-adds a removed one.
  const [latest] = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1);
  if (!latest) throw new HttpError(404, "Invitation not found");
  if (latest.status === "accepted") {
    const [member] = await db.select({ id: projectMembers.id }).from(projectMembers)
      .where(and(eq(projectMembers.projectId, latest.projectId), eq(projectMembers.userId, user.id))).limit(1);
    if (member) return { projectId: latest.projectId };
    throw new HttpError(403, "This invitation has already been used. Ask the project owner for a new link.");
  }
  throw new HttpError(409, "This invitation changed or expired. Reload the page before trying again.");
}
