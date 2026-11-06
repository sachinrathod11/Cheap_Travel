// Requires a dedicated local server with tests/fixtures/openai-web-preload.cjs.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";
nextEnv.loadEnvConfig(process.cwd());
const base = process.env.TEST_APP_URL || "http://127.0.0.1:3118";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Use a local test server.");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let userId;
async function post(path, body, cookie) {
  const response = await fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
try {
  const registered = await post("/api/auth/register", {
    email: `web-${randomUUID()}@example.test`,
    password: "fixture-account-password-long",
  });
  assert.equal(registered.status, 201);
  userId = registered.data.user.id;
  const checkIn = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .slice(0, 10),
    checkOut = new Date(Date.now() + 32 * 86400000).toISOString().slice(0, 10);
  const stay = { destination: "Goa", checkIn, checkOut, adults: 2 };
  assert.equal((await post("/api/web-search", stay)).status, 401);
  const clarification = await post(
    "/api/assistant",
    { question: "Compare hotels in Goa" },
    registered.cookie,
  );
  assert.equal(clarification.status, 200);
  assert.equal(clarification.data.mode, "ai-retrieval");
  assert.ok(!clarification.data.webResult);
  const chat = await post(
    "/api/assistant",
    { question: `Search Goa from ${checkIn} to ${checkOut} for 2 adults` },
    registered.cookie,
  );
  assert.equal(chat.data.mode, "web-search");
  assert.equal(chat.data.webResult.verification, "public-web-leads");
  assert.equal(chat.data.webResult.sources[0].title, "Fixture hotel page");
  const form = await post("/api/web-search", stay, registered.cookie);
  assert.equal(form.status, 200);
  assert.equal(form.data.verification, "public-web-leads");
  const attempts = await Promise.all(
    Array.from({ length: 7 }, () =>
      post("/api/web-search", stay, registered.cookie),
    ),
  );
  assert.equal(attempts.filter((a) => a.status === 200).length, 4);
  assert.equal(attempts.filter((a) => a.status === 429).length, 3);
  console.log(
    "PASS mocked-provider integration: chat clarification, authenticated chat-to-web-tool routing, form search, source evidence and atomic six-search quota shared by both entry points. No live hotel rates were fetched.",
  );
} finally {
  if (userId) await pool.query('DELETE FROM "User" WHERE id=$1', [userId]);
  await pool.end();
}
