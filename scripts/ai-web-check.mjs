import nextEnv from "@next/env";
import { searchPublicHotels, WebSearchError } from "../lib/web-search.ts";
nextEnv.loadEnvConfig(process.cwd());
try {
  const checkIn = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .slice(0, 10),
    checkOut = new Date(Date.now() + 32 * 86400000).toISOString().slice(0, 10);
  const result = await searchPublicHotels({
    destination: "Goa, India",
    checkIn,
    checkOut,
    adults: 2,
    hotelName: "",
    budget: 0,
  });
  console.log(
    "Web-search tool succeeded. These are cited research leads, not verified date-specific room rates.",
  );
  console.log(result.answer);
  for (const source of result.sources) console.log(source.title, source.url);
} catch (error) {
  console.error(
    error instanceof WebSearchError
      ? `Web-search check failed [${error.code}]: ${error.message}`
      : "Web-search check failed: unexpected provider response.",
  );
  process.exitCode = 1;
}
