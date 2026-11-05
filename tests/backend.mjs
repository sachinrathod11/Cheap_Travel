// Run against your own local test server, never a shared production deployment.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";
nextEnv.loadEnvConfig(process.cwd());
const base = process.env.TEST_APP_URL || "http://127.0.0.1:3100";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Use a local test server.");
const users = [];
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function request(path, method = "GET", body, cookie) {
  const r = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
try {
  const password = "test-account-password-with-32-chars";
  const a = await request("/api/auth/register", "POST", {
    email: `test-${randomUUID()}@example.test`,
    password,
  });
  assert.equal(a.status, 201);
  users.push(a.data.user.id);
  assert.ok(a.cookie);
  const b = await request("/api/auth/register", "POST", {
    email: `test-${randomUUID()}@example.test`,
    password,
  });
  assert.equal(b.status, 201);
  users.push(b.data.user.id);
  assert.equal((await request("/api/bookings")).status, 401);
  const checkIn = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .slice(0, 10),
    checkOut = new Date(Date.now() + 33 * 86400000).toISOString().slice(0, 10);
  const name = `Private hotel ${randomUUID()}`;
  const created = await request(
    "/api/bookings",
    "POST",
    {
      hotelId: "custom",
      hotelName: name,
      checkIn,
      checkOut,
      guests: 2,
      roomDescription: "King room",
      mealPlan: "Breakfast",
      originalTotal: 20000,
      cancellationFee: 1000,
      cancellationBefore: new Date(Date.now() + 20 * 86400000).toISOString(),
    },
    a.cookie,
  );
  assert.equal(created.status, 201);
  const id = created.data.booking.id;
  assert.equal(
    (
      await request("/api/bookings", "GET", undefined, a.cookie)
    ).data.bookings.some((v) => v.id === id),
    true,
  );
  assert.equal(
    (
      await request(
        `/api/bookings/${id}/prices`,
        "POST",
        { total: 17000.5, provider: "Manual test" },
        b.cookie,
      )
    ).status,
    404,
  );
  const price = await request(
    `/api/bookings/${id}/prices`,
    "POST",
    { total: 17000.5, provider: "Manual test" },
    a.cookie,
  );
  assert.equal(price.status, 201);
  assert.equal(price.data.snapshot.total, 17000.5);
  const own = await request(
    "/api/assistant",
    "POST",
    { question: "Tell me about my booking and cancellation terms" },
    a.cookie,
  );
  assert.equal(own.status, 200);
  assert.ok(own.data.sources.some((v) => v.title.includes(name)));
  const other = await request(
    "/api/assistant",
    "POST",
    { question: "Tell me about my booking and cancellation terms" },
    b.cookie,
  );
  assert.ok(!other.data.sources.some((v) => v.title.includes(name)));
  assert.equal(
    (await request(`/api/bookings/${id}`, "DELETE", undefined, b.cookie))
      .status,
    404,
  );
  assert.equal(
    (await request(`/api/bookings/${id}`, "DELETE", undefined, a.cookie))
      .status,
    200,
  );
  const noKey = await request(
    `/api/search?cityCode=DEL&checkIn=${checkIn}&checkOut=${checkOut}&adults=2`,
  );
  assert.equal(noKey.status, 503);
  assert.ok(!noKey.data.quotes);
  assert.equal(
    (await request("/api/auth/logout", "POST", undefined, a.cookie)).status,
    200,
  );
  console.log(
    "PASS: registration, sessions, booking persistence, decimal prices, owner-only reads/writes and retrieval, deletion, and explicit missing-provider configuration.",
  );
} finally {
  for (const id of users)
    await pool.query('DELETE FROM "User" WHERE id=$1', [id]);
  await pool.end();
}
