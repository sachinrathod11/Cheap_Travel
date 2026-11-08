// Creates an isolated schema and test-only server; never uses production map data.
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import nextEnv from "@next/env";
import pg from "pg";
nextEnv.loadEnvConfig(process.cwd());
const schema = "test_locations_" + randomUUID().replaceAll("-", "");
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const connection = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1", "[::1]", "db"].includes(connection.hostname))
  throw Error("Use a local test database for this suite.");
connection.searchParams.set("options", `-c search_path=${schema}`);
const scoped = new pg.Pool({ connectionString: connection.href });
const lease = createServer();
await new Promise((resolve, reject) => {
  lease.once("error", reject);
  lease.listen(0, "127.0.0.1", resolve);
});
const port = lease.address().port;
await new Promise((resolve) => lease.close(resolve));
const base = `http://127.0.0.1:${port}`;
let server,
  created = false;
const fixture = fileURLToPath(
  new URL("./fixtures/location-preload.cjs", import.meta.url),
);
const env = {
  ...process.env,
  DATABASE_URL: connection.href,
  AUTH_SECRET: randomBytes(32).toString("hex"),
  AI_API_KEY: "fixture",
  AI_MODEL: "fixture",
  AI_WEB_SEARCH_MODEL: "fixture",
  NODE_USE_ENV_PROXY: "1",
  NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --require="${fixture}"`,
};
async function req(path, method = "GET", body, cookie) {
  const r = await fetch(base + path, {
    method,
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: r.status,
    data: r.headers.get("content-type")?.includes("application/json")
      ? await r.json()
      : null,
    cookie: r.headers.get("set-cookie")?.split(";")[0],
    location: r.headers.get("location"),
    referrer: r.headers.get("referrer-policy"),
  };
}
try {
  await admin.query(`CREATE SCHEMA "${schema}"`);
  created = true;
  const migration = spawnSync(process.execPath, ["scripts/init-db.mjs"], {
    env,
    encoding: "utf8",
  });
  assert.equal(migration.status, 0, "Isolated test migrations failed.");
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { env, stdio: "ignore" },
  );
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null)
      throw Error("The isolated test server exited before readiness.");
    try {
      if ((await fetch(base + "/api/auth/session")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.ok(ready, "Test server did not start.");
  const a = await req("/api/auth/register", "POST", {
      email: `a-${randomUUID()}@example.test`,
      password: "fixture-account-password-123",
    }),
    b = await req("/api/auth/register", "POST", {
      email: `b-${randomUUID()}@example.test`,
      password: "fixture-account-password-123",
    });
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  const nearby = await req(
    "/api/nearby-hotels?region=goa&referenceId=goi&radiusKm=5",
  );
  assert.equal(nearby.status, 200);
  assert.equal(nearby.data.hotels.length, 2);
  assert.ok(
    nearby.data.hotels.every(
      (h) => h.distanceKm <= 5 && h.nightlyPrice === null,
    ),
  );
  assert.equal(nearby.data.hotels[0].website, "https://hotel.example/rooms");
  const filtered = await req(
    "/api/nearby-hotels?region=goa&referenceId=goi&radiusKm=5&minStars=4",
  );
  assert.equal(filtered.data.hotels.length, 1);
  const checkIn = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .slice(0, 10),
    checkOut = new Date(Date.now() + 32 * 86400000).toISOString().slice(0, 10);
  const draft = {
    hotelName: "Near Airport Fixture Hotel",
    targetUrl: "https://hotel.example/rooms",
    city: "Goa",
    referenceId: "goi",
    radiusKm: 5,
    catalogId: "node/101",
    checkIn,
    checkOut,
    guests: 2,
    quotedTotal: 3800,
    consent: true,
  };
  assert.equal((await req("/api/handoffs", "POST", draft)).status, 401);
  assert.equal(
    (await req("/api/handoffs", "POST", { ...draft, consent: false }, a.cookie))
      .status,
    400,
  );
  const visit = await req("/api/handoffs", "POST", draft, a.cookie);
  assert.equal(visit.status, 201);
  const id = visit.data.id;
  assert.equal(
    (await scoped.query('SELECT count(*) FROM "Booking"')).rows[0].count,
    "0",
  );
  assert.equal(
    (await req("/api/handoffs", "GET", undefined, b.cookie)).data.visits.length,
    0,
  );
  assert.equal(
    (await req(`/outbound/${id}`, "GET", undefined, b.cookie)).status,
    404,
  );
  const open = await req(`/outbound/${id}`, "GET", undefined, a.cookie);
  assert.equal(open.status, 303);
  assert.equal(open.location, draft.targetUrl);
  assert.equal(open.referrer, "no-referrer");
  assert.equal(
    (await req("/api/handoffs", "GET", undefined, a.cookie)).data.visits[0]
      .status,
    "opened",
  );
  assert.equal(
    (await scoped.query('SELECT count(*) FROM "Booking"')).rows[0].count,
    "0",
  );
  const confirmation = {
    confirmed: true,
    booking: {
      hotelId: "custom",
      hotelName: draft.hotelName,
      checkIn,
      checkOut,
      guests: 2,
      roomDescription: "King room",
      mealPlan: "Breakfast included",
      originalTotal: 4200,
      cancellationFee: 200,
      cancellationBefore: null,
    },
  };
  assert.equal(
    (await req(`/api/handoffs/${id}`, "PATCH", confirmation, b.cookie)).status,
    404,
  );
  const confirmations = await Promise.all([
    req(`/api/handoffs/${id}`, "PATCH", confirmation, a.cookie),
    req(`/api/handoffs/${id}`, "PATCH", confirmation, a.cookie),
  ]);
  assert.deepEqual(confirmations.map((r) => r.status).sort(), [200, 201]);
  assert.equal(
    confirmations[0].data.bookingId,
    confirmations[1].data.bookingId,
  );
  const saved = await req("/api/bookings", "GET", undefined, a.cookie);
  assert.equal(saved.data.bookings.length, 1);
  assert.equal(saved.data.bookings[0].originalTotal, 4200);
  assert.equal(saved.data.bookings[0].sourceUrl, draft.targetUrl);
  assert.equal(saved.data.bookings[0].snapshots[0].total, 4200);
  assert.equal(saved.data.bookings[0].monitoringEnabled, false);
  const second = await req("/api/handoffs", "POST", draft, a.cookie);
  assert.equal(
    (
      await req(
        `/api/handoffs/${second.data.id}`,
        "PATCH",
        { action: "dismiss" },
        a.cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await req("/api/handoffs", "GET", undefined, a.cookie)).data.pendingCount,
    0,
  );
  if (process.env.TEST_BROWSER_SCRIPT) {
    const browser = spawnSync(
      process.execPath,
      [process.env.TEST_BROWSER_SCRIPT],
      {
        env: {
          ...process.env,
          DATABASE_URL: connection.href,
          TEST_APP_URL: base,
        },
        stdio: "inherit",
      },
    );
    assert.equal(browser.status, 0, "Browser check failed.");
  }
  console.log(
    "PASS isolated PostgreSQL/fixture integration: radius and star filters, owned outbound redirects, click-not-purchase state, explicit paid-total confirmation, idempotent concurrent confirmation, dismissals and original price history. No real hotels were fetched or booked.",
  );
} finally {
  if (server) {
    server.kill("SIGTERM");
    await Promise.race([
      new Promise((r) => server.once("exit", r)),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }
  await scoped.end();
  if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
  await admin.end();
}
