// Better Auth creates the user and password account inside a transaction.
// Neon's HTTP driver cannot run transactions, so this uses the Neon WebSocket pool.
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

if (typeof WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = WebSocket;
}

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@127.0.0.1:5432/lumen";

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
