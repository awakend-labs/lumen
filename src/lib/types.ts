export type ViewMode = "grid" | "list";

export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export const PROJECT_ROLES = ["owner", "editor", "viewer"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const PROJECT_STATUSES = ["in_progress", "documented"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const STASH_STATUSES = [
  "in_development",
  "active",
  "testing",
  "deprecated",
] as const;
export type StashStatus = (typeof STASH_STATUSES)[number];

export const INVITE_ROLES = ["editor", "viewer"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

export const INVITE_STATUSES = ["pending", "accepted", "expired"] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export const STASH_COLORS = [
  "slate",
  "blue",
  "green",
  "amber",
  "red",
  "violet",
  "pink",
  "teal",
] as const;

export type StashColor = (typeof STASH_COLORS)[number];

export const AUTH_SCHEMES = ["none", "bearer", "api_key", "basic"] as const;
export const ACCESS_LEVELS = ["public", "authenticated", "admin_only"] as const;
export const FIELD_TYPES = ["string", "integer", "number", "boolean", "object", "array"] as const;
export type ProjectAuth = { scheme: typeof AUTH_SCHEMES[number]; headerName: string; location: "header" | "query"; description: string };
export type ParamField = {
  type?: typeof FIELD_TYPES[number];
  enum?: string[];
  default?: string;
  format?: string;
  min?: number;
  max?: number;
  key: string;
  value: string;
  required: boolean;
  description: string;
};

export type RequestBodyDoc = {
  contentType?: string;
  raw?: string;
  schema?: unknown;
  fields?: ParamField[];
  example?: unknown;
} | null;

export type ResponseDoc = {
  statusCode: number;
  description: string;
  body?: unknown;
  schema?: unknown;
};

export type EndpointRecord = {
  groupId: string | null;
  access: typeof ACCESS_LEVELS[number];
  id: string;
  stashId: string;
  projectId: string;
  name: string;
  method: HttpMethod;
  path: string;
  baseUrl: string;
  description: string;
  headers: ParamField[];
  queryParams: ParamField[];
  pathParams: ParamField[];
  requestBody: RequestBodyDoc;
  responses: ResponseDoc[];
  tags: string[];
  version: string;
  isDeprecated: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type StashRecord = {
  groups: ApiGroupRecord[];
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  color: StashColor;
  status: StashStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
  endpoints: EndpointRecord[];
};

export type ApiGroupRecord = { id: string; stashId: string; name: string };

export type ProjectDetail = {
  auth: ProjectAuth;
  id: string;
  name: string;
  description: string | null;
  slug: string;
  role: ProjectRole;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  stashes: StashRecord[];
};

export type ProjectStashPreview = {
  id: string;
  name: string;
  color: StashColor;
};

export type ProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  role: ProjectRole;
  status: ProjectStatus;
  stashCount: number;
  endpointCount: number;
  previewStashes: ProjectStashPreview[];
  createdAt: string;
  updatedAt: string;
};

export type MemberRecord = {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: ProjectRole;
  createdAt: string;
};

export type InvitationRecord = {
  id: string;
  email: string;
  role: InviteRole;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
  link: string;
};

export type InvitationPreview = {
  projectId: string;
  projectName: string;
  email: string;
  role: InviteRole;
  status: InviteStatus;
  expiresAt: string;
};
