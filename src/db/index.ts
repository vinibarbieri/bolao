import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Supabase's transaction-mode pooler (port 6543, pgBouncer) does not support
// prepared statements. postgres-js defaults to prepare:true, which causes
// intermittent `prepared statement "sX" does not exist` errors. Disable it.
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
