import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { sendPasswordResetEmail } from "@/server/password-reset-email";
import { account, accountRelations, session, sessionRelations, user, userRelations, verification } from "@/db/schema";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const publicURL = process.env.NEXT_PUBLIC_APP_URL ?? baseURL;

export const auth = betterAuth({
  appName: "Lumen",
  baseURL,
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "development-only-secret-replace-in-env-file",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification, userRelations, sessionRelations, accountRelations },
  }),
  advanced: { database: { joins: true } },
  user: { deleteUser: { enabled: true } },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/delete-user" && (typeof ctx.body?.password !== "string" || !ctx.body.password)) {
        throw new APIError("BAD_REQUEST", { code: "PASSWORD_REQUIRED", message: "Enter your current password to delete your account." });
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: 60 * 30,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ email: user.email, url });
    },
  },
  trustedOrigins: [...new Set([baseURL, publicURL].filter(Boolean))],
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
