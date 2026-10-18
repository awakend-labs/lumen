// Neon HTTP driver (fetch). Defer client creation until first query so Cloudflare
// Workers have populated process.env from bindings (see @opennextjs/cloudflare init).
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type AppDb = NeonHttpDatabase<typeof schema>;

let cached: AppDb | undefined;

function createDb(): AppDb {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return drizzle(neon(connectionString), { schema });
}

function getDb(): AppDb {
  if (!cached) {
    cached = createDb();
  }
  return cached;
}

export const db = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real, prop, receiver);
    if (typeof value === "function") {
      return value.bind(real);
    }
    return value;
  },
});
