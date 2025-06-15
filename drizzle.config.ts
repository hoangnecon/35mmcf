// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import path from "path"; // Import path module

// Define the path for the local SQLite database file
const sqliteDbPath = path.resolve(process.cwd(), "drizzle.sqlite");

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "sqlite", // Changed dialect to sqlite
  dbCredentials: {
    url: sqliteDbPath, // Use the local file path as the URL
  },
  // You might not need this for SQLite, as it doesn't typically require a separate Drizzle URL
  // If you want to keep it, ensure it's handled correctly for local development.
  // For now, I'm removing the DATABASE_URL check as it's not needed for local SQLite.
});