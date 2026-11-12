import { neon, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("WARNING: DATABASE_URL is not set. Database operations will fail until configured.");
}

const sql = neon(connectionString || "");
export const db = drizzle(sql, { schema });

/**
 * Verifies active database connectivity by executing a lightweight query.
 */
export async function checkDatabaseConnection(): Promise<{ ok: boolean; message: string; version?: string }> {
  if (!connectionString) {
    return { ok: false, message: "DATABASE_URL is not configured in environment." };
  }
  try {
    const result = await sql`SELECT version() AS version;`;
    const version = (result && result[0] && (result[0] as { version: string }).version) || "PostgreSQL (Neon)";
    return { ok: true, message: "Database connected successfully", version };
  } catch (error: any) {
    return { ok: false, message: error?.message || "Unknown database connection error" };
  }
}

export { schema };
