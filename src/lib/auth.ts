import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  appName: "Lumen",
  baseURL,
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "development-only-secret-replace-in-env-file",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [baseURL],
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
