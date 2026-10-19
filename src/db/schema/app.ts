import { relations, sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  json,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { account, session, user } from "./auth";
import type {
  HttpMethod,
  ProjectAuth,
  InviteRole,
  InviteStatus,
  ParamField,
  ProjectRole,
  ProjectStatus,
  RequestBodyDoc,
  StashStatus,
  ResponseDoc,
  StashColor,
} from "@/lib/types";

export const httpMethod = pgEnum("http_method", [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
]);

export const projectRole = pgEnum("project_role", [
  "owner",
  "editor",
  "viewer",
]);

export const projectStatus = pgEnum("project_status", [
  "in_progress",
  "documented",
]);

export const stashStatus = pgEnum("stash_status", [
  "in_development",
  "active",
  "testing",
  "deprecated",
]);

export const invitationStatus = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    slug: text("slug").notNull().unique(),
    status: projectStatus("status").$type<ProjectStatus>().notNull().default("in_progress"),
    auth: jsonb("auth").$type<ProjectAuth>().notNull().default({ scheme: "none", headerName: "X-API-Key", location: "header", description: "" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [index("projects_owner_id_idx").on(table.ownerId)],
);

export const stashes = pgTable(
  "stashes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color").$type<StashColor>(),
    status: stashStatus("status").$type<StashStatus>().notNull().default("in_development"),
    order: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("stashes_project_order_idx").on(table.projectId, table.order),
    uniqueIndex("stashes_project_name_uidx").on(table.projectId, sql`lower(btrim(${table.name}))`),
  ],
);

export const apiGroups = pgTable("api_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  stashId: uuid("stash_id").notNull().references(() => stashes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("api_groups_id_stash_uidx").on(table.id, table.stashId),
  uniqueIndex("api_groups_stash_name_uidx").on(table.stashId, sql`lower(${table.name})`),
]);

export const endpoints = pgTable(
  "endpoints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stashId: uuid("stash_id")
      .notNull()
      .references(() => stashes.id, { onDelete: "cascade" }),
    groupId: uuid("group_id").references(() => apiGroups.id, { onDelete: "set null" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    method: httpMethod("method").notNull(),
    path: text("path").notNull(),
    baseUrl: text("base_url").notNull().default(""),
    description: text("description").notNull().default(""),
    headers: jsonb("headers").$type<ParamField[]>().notNull().default([]),
    queryParams: jsonb("query_params").$type<ParamField[]>().notNull().default([]),
    pathParams: jsonb("path_params").$type<ParamField[]>().notNull().default([]),
    requestBody: json("request_body").$type<RequestBodyDoc>(),
    responses: json("responses").$type<ResponseDoc[]>().notNull().default([]),
    tags: text("tags").array().notNull().default([]),
    version: text("version").notNull().default("v1"),
    access: text("access").$type<"public" | "authenticated" | "admin_only">().notNull().default("public"),
    isDeprecated: boolean("is_deprecated").notNull().default(false),
    order: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    foreignKey({ columns: [table.groupId, table.stashId], foreignColumns: [apiGroups.id, apiGroups.stashId], name: "endpoints_group_stash_fk" }),
    uniqueIndex("endpoints_project_version_name_uidx").on(table.projectId, table.version, sql`lower(${table.name})`),
    uniqueIndex("endpoints_project_version_route_uidx").on(table.projectId, table.version, table.method, sql`regexp_replace(${table.path}, '[{][A-Za-z_][A-Za-z0-9_]*[}]|:[A-Za-z_][A-Za-z0-9_]*', '{}', 'g')`),
    index("endpoints_stash_id_idx").on(table.stashId),
    index("endpoints_project_id_idx").on(table.projectId),
    index("endpoints_stash_order_idx").on(table.stashId, table.order),
  ],
);

export const endpointDrafts = pgTable("endpoint_drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  key: text("draft_key").notNull(),
  payload: text("payload"),
  revision: uuid("revision").defaultRandom().notNull(),
  writeOrder: integer("write_order").notNull().default(0),
  ...timestamps,
}, table => [uniqueIndex("endpoint_drafts_user_project_key_uidx").on(table.userId, table.projectId, table.key)]);

export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: projectRole("role").notNull(),
    invitedBy: text("invited_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("project_members_project_user_uidx").on(
      table.projectId,
      table.userId,
    ),
    index("project_members_user_id_idx").on(table.userId),
  ],
);

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  endpointView: text("endpoint_view").notNull().default("grid"),
});

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: projectRole("role").notNull().$type<InviteRole>(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    status: invitationStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("invitations_project_id_idx").on(table.projectId),
    index("invitations_token_idx").on(table.token),
  ],
);

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  ownedProjects: many(projects, { relationName: "projectOwner" }),
  memberships: many(projectMembers, { relationName: "memberUser" }),
  invitedMemberships: many(projectMembers, { relationName: "memberInviter" }),
  preferences: one(userPreferences, {
    fields: [user.id],
    references: [userPreferences.userId],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(user, {
    fields: [projects.ownerId],
    references: [user.id],
    relationName: "projectOwner",
  }),
  stashes: many(stashes),
  endpoints: many(endpoints),
  members: many(projectMembers),
  invitations: many(invitations),
}));

export const stashesRelations = relations(stashes, ({ one, many }) => ({
  project: one(projects, {
    fields: [stashes.projectId],
    references: [projects.id],
  }),
  endpoints: many(endpoints),
}));

export const endpointsRelations = relations(endpoints, ({ one }) => ({
  stash: one(stashes, {
    fields: [endpoints.stashId],
    references: [stashes.id],
  }),
  project: one(projects, {
    fields: [endpoints.projectId],
    references: [projects.id],
  }),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(user, {
    fields: [projectMembers.userId],
    references: [user.id],
    relationName: "memberUser",
  }),
  inviter: one(user, {
    fields: [projectMembers.invitedBy],
    references: [user.id],
    relationName: "memberInviter",
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  project: one(projects, {
    fields: [invitations.projectId],
    references: [projects.id],
  }),
}));

export type ProjectRow = typeof projects.$inferSelect;
export type StashRow = typeof stashes.$inferSelect;
export type EndpointRow = typeof endpoints.$inferSelect;
export type { HttpMethod, ProjectRole, InviteStatus };
