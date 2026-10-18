// Neon HTTP driver: one-shot queries over fetch. Works on Node (next dev) and
// Cloudflare Workers. The WebSocket Pool must be created and closed per request
// on Workers; a module-level Pool causes 500s on sign-up/sign-in.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@127.0.0.1:5432/lumen";

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
