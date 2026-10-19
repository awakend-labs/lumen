import { z } from "zod";
import {
  HTTP_METHODS, AUTH_SCHEMES, ACCESS_LEVELS, FIELD_TYPES,
  INVITE_ROLES,
  PROJECT_STATUSES,
  STASH_COLORS,
  STASH_STATUSES,
} from "@/lib/types";

import { validEndpointPath, pathParameterNames } from "@/lib/endpoint-path";

export const projectAuthSchema = z.object({
  scheme: z.enum(AUTH_SCHEMES),
  headerName: z.string().trim().max(120).default("X-API-Key"),
  location: z.enum(["header", "query"]).default("header"),
  description: z.string().max(2000).default(""),
}).refine(value => value.scheme !== "api_key" || /^[A-Za-z0-9_-]+$/.test(value.headerName), "Enter an API key parameter name");

export const signInSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name must be 80 characters or fewer."),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(128),
});

export const projectInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name must be 80 characters or fewer."),
  description: z.string().trim().max(500).optional().default(""),
  status: z.enum(PROJECT_STATUSES).optional(),
});

export const projectStatusSchema = z.object({
  status: z.enum(PROJECT_STATUSES),
});

export const stashInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name must be 80 characters or fewer."),
  description: z.string().trim().max(500).optional().default(""),
  color: z.enum(STASH_COLORS).default("blue"),
  status: z.enum(STASH_STATUSES).optional(),
});

export const stashStatusSchema = z.object({
  status: z.enum(STASH_STATUSES),
});

export const apiGroupInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name must be 80 characters or fewer."),
});

export const routeVersionSchema = z
  .string()
  .trim()
  .min(1, "Version is required")
  .max(12)
  .regex(/^v\d+$/i, "Use a version like v1 or v2")
  .transform((value) => value.toLowerCase());

export const reorderSchema = z.object({
  ids: z.array(z.uuid()).min(1),
});

export const paramFieldSchema = z.object({
  type: z.enum(FIELD_TYPES).optional(),
  enum: z.array(z.string().max(500)).max(100).optional(),
  default: z.string().max(2000).optional(),
  format: z.string().max(120).optional(),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  key: z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or fewer."),
  value: z.string().max(2000).optional().default(""),
  required: z.boolean().optional().default(false),
  description: z.string().max(500).optional().default(""),
});

const requestBodySchema = z
  .object({
    contentType: z.enum(["application/json", "application/x-www-form-urlencoded", "multipart/form-data", "text/plain"]).optional(),
    raw: z.string().max(20000).optional(),
    schema: z.unknown().optional(),
    fields: z.array(paramFieldSchema).max(200).optional(),
    example: z.unknown().optional(),
  })
  .nullable()
  .optional();

const responseDocSchema = z.object({
  statusCode: z.number().int().min(100).max(599),
  description: z.string().max(2000).optional().default(""),
  body: z.unknown().optional(),
  schema: z.unknown().optional(),
});

export const baseUrlSchema = z.string().trim().max(2000).refine(value => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password &&
      !url.search && !url.hash;
  } catch { return false; }
}, "Use an HTTP or HTTPS base URL without credentials, query parameters, or fragments.").transform(value => value.replace(/\/+$/, ""));

export const endpointInputSchema = z.object({
  draft: z.object({ key: z.string().max(120), revision: z.uuid() }).optional(),
  groupId: z.uuid().nullable().optional(),
  baseUrl: baseUrlSchema.default(""),
  access: z.enum(ACCESS_LEVELS).default("public"),
  stashId: z.uuid(),
  name: z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or fewer."),
  method: z.enum(HTTP_METHODS),
  path: z
    .string()
    .trim()
    .min(1, "Path is required")
    .max(300)
    .refine(validEndpointPath, "Use a path starting with /, without spaces, # or ?. Use {id} or :id for parameters."),
  description: z.string().max(20000).optional().default(""),
  headers: z.array(paramFieldSchema).optional().default([]),
  queryParams: z.array(paramFieldSchema).optional().default([]),
  pathParams: z.array(paramFieldSchema).optional().default([]),
  requestBody: requestBodySchema,
  responses: z.array(responseDocSchema).optional().default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
  version: routeVersionSchema.optional().default("v1"),
  isDeprecated: z.boolean().optional().default(false),
}).superRefine((value, ctx) => {
  const names = pathParameterNames(value.path);
  if (value.pathParams.length !== names.length || names.some(name => !value.pathParams.some(param => param.key === name && param.required))) {
    ctx.addIssue({ code: "custom", path: ["pathParams"], message: "Path parameters must match the route and be required" });
  }
  for (const group of ["headers", "queryParams", "pathParams"] as const) {
    const keys = value[group].map(field => group === "headers" ? field.key.toLowerCase() : field.key);
    if (new Set(keys).size !== keys.length) ctx.addIssue({code: "custom", path: [group], message: "Field names must be unique"});
  }
  for (const field of [...value.headers, ...value.queryParams, ...value.pathParams, ...(value.requestBody?.fields ?? [])]) {
    if (field.min !== undefined && field.max !== undefined && field.min > field.max) ctx.addIssue({code: "custom", message: "Minimum cannot exceed maximum"});
  }
});

export const invitationInputSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email")).transform(email => email.toLowerCase()),
  role: z.enum(INVITE_ROLES),
});

export const memberRoleSchema = z.object({
  role: z.enum(INVITE_ROLES),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;
export type StashInput = z.infer<typeof stashInputSchema>;
export type EndpointInput = z.infer<typeof endpointInputSchema>;
export type InvitationInput = z.infer<typeof invitationInputSchema>;
