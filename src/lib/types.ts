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

export type ParamField = {
  key: string;
  value: string;
  required: boolean;
  description: string;
};

export type RequestBodyDoc = {
  schema?: unknown;
  example?: unknown;
} | null;

export type ResponseDoc = {
  statusCode: number;
  description: string;
  body?: unknown;
  schema?: unknown;
};

export type EndpointRecord = {
  id: string;
  stashId: string;
  projectId: string;
  name: string;
  method: HttpMethod;
  path: string;
  description: string;
  headers: ParamField[];
  queryParams: ParamField[];
  pathParams: ParamField[];
  requestBody: RequestBodyDoc;
  responses: ResponseDoc[];
  tags: string[];
  isDeprecated: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type StashRecord = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  color: StashColor;
  order: number;
  createdAt: string;
  updatedAt: string;
  endpoints: EndpointRecord[];
};

export type ProjectDetail = {
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

export type ProjectEndpointPreview = {
  method: HttpMethod;
  path: string;
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
  previewEndpoints: ProjectEndpointPreview[];
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
