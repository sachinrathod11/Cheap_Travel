import { readFile } from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL before initializing the database.");
const sql = await readFile(
  new URL(
    "../prisma/migrations/20261105000000_init/migration.sql",
    import.meta.url,
  ),
  "utf8",
);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(sql);
  console.log("Cheap Travel database tables initialized.");
} finally {
  await pool.end();
}
