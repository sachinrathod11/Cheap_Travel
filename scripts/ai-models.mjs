import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.AI_API_KEY)
  throw Error("Set AI_API_KEY privately in .env.local first.");
const response = await fetch("https://api.openai.com/v1/models", {
  headers: { Authorization: `Bearer ${process.env.AI_API_KEY}` },
  signal: AbortSignal.timeout(20000),
});
if (!response.ok)
  throw Error(
    `Could not list API models (status ${response.status}). Check API access, billing and network settings.`,
  );
const data = await response.json();
console.log(
  "API model IDs available to this account (not all support chat, reasoning or structured output):",
);
for (const model of data.data.map((m) => m.id).sort()) console.log(model);
