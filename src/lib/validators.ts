import { z } from "zod";
import { HTTP_METHODS, INVITE_ROLES, STASH_COLORS } from "@/lib/types";

export const signInSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(128),
});

export const projectInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(500).optional().default(""),
});

export const stashInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(500).optional().default(""),
  color: z.enum(STASH_COLORS).default("blue"),
});

export const reorderSchema = z.object({
  ids: z.array(z.uuid()).min(1),
});

const paramFieldSchema = z.object({
  key: z.string().trim().min(1, "Name is required").max(120),
  value: z.string().max(2000).optional().default(""),
  required: z.boolean().optional().default(false),
  description: z.string().max(500).optional().default(""),
});

const requestBodySchema = z
  .object({
    schema: z.unknown().optional(),
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

export const endpointInputSchema = z.object({
  stashId: z.uuid(),
  name: z.string().trim().min(1, "Name is required").max(120),
  method: z.enum(HTTP_METHODS),
  path: z
    .string()
    .trim()
    .min(1, "Path is required")
    .max(300)
    .refine((path) => path.startsWith("/"), "Path must start with /"),
  description: z.string().max(20000).optional().default(""),
  headers: z.array(paramFieldSchema).optional().default([]),
  queryParams: z.array(paramFieldSchema).optional().default([]),
  pathParams: z.array(paramFieldSchema).optional().default([]),
  requestBody: requestBodySchema,
  responses: z.array(responseDocSchema).optional().default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
  isDeprecated: z.boolean().optional().default(false),
});

export const invitationInputSchema = z.object({
  email: z.email("Enter a valid email"),
  role: z.enum(INVITE_ROLES),
});

export const memberRoleSchema = z.object({
  role: z.enum(INVITE_ROLES),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;
export type StashInput = z.infer<typeof stashInputSchema>;
export type EndpointInput = z.infer<typeof endpointInputSchema>;
export type InvitationInput = z.infer<typeof invitationInputSchema>;
