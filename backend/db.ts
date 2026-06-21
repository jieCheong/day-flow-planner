import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");

export const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("sslmode=require") ? "require" : false,
  max: 10,
  idle_timeout: 30,
});
