import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.MONITOR_SECRET || process.env.MONITOR_SECRET.length < 32)
  throw Error(
    "Set MONITOR_SECRET to a random secret of at least 32 characters.",
  );
const endpoint = new URL(
  "/api/monitor",
  process.env.APP_URL || "http://localhost:3000",
);
if (
  !["localhost", "127.0.0.1"].includes(endpoint.hostname) &&
  endpoint.protocol !== "https:"
)
  throw Error("Remote APP_URL must use HTTPS.");
async function tick() {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MONITOR_SECRET}` },
    signal: AbortSignal.timeout(300000),
  });
  if (!response.ok)
    throw Error(`Monitor request failed with status ${response.status}`);
  console.log(new Date().toISOString(), await response.json());
}
if (process.argv.includes("--once")) await tick();
else {
  for (;;) {
    try {
      await tick();
    } catch {
      console.error(
        "Monitoring failed. Check server and provider configuration.",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 30 * 60 * 1000));
  }
}
