import { readFile } from "node:fs/promises";
import pg from "pg";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL before initializing the database.");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(173729)");
  await client.query(
    'CREATE TABLE IF NOT EXISTS "SchemaMigration" (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())',
  );
  // Adopt installations created before migration tracking was introduced.
  const existing = await client.query(
    `SELECT to_regclass('public."User"') AS existing`,
  );
  if (existing.rows[0].existing)
    await client.query(
      'INSERT INTO "SchemaMigration" (name) VALUES ($1) ON CONFLICT DO NOTHING',
      ["20261105000000_init"],
    );
  for (const name of ["20261105000000_init", "20261105000001_monitoring"]) {
    if (
      (
        await client.query('SELECT name FROM "SchemaMigration" WHERE name=$1', [
          name,
        ])
      ).rowCount
    )
      continue;
    const sql = await readFile(
      new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url),
      "utf8",
    );
    await client.query(sql);
    await client.query('INSERT INTO "SchemaMigration" (name) VALUES ($1)', [
      name,
    ]);
  }
  await client.query("COMMIT");
  console.log("Database migrations are up to date.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
