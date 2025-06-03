// server/db.ts
import { drizzle } from 'drizzle-orm/better-sqlite3'; // Changed import for better-sqlite3
import Database from 'better-sqlite3'; // Import better-sqlite3 directly
import * as schema from "@shared/schema";
import path from "path"; // Import path module

// Define the path for the local SQLite database file
const sqliteDbPath = path.resolve(process.cwd(), "drizzle.sqlite");

// Initialize better-sqlite3 database instance
const sqlite = new Database(sqliteDbPath);

// Initialize Drizzle with the better-sqlite3 client
export const db = drizzle(sqlite, { schema });

// No need for neonConfig or DATABASE_URL check for local SQLite
// if (!process.env.DATABASE_URL) {
//   throw new Error(
//     "DATABASE_URL must be set. Did you forget to provision a database?",
//   );
// }
// export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// export const db = drizzle({ client: pool, schema });