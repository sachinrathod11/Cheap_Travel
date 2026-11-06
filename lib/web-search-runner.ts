import { db } from "@/lib/db";
import {
  searchPublicHotels,
  WebSearchError,
  type WebStay,
} from "@/lib/web-search";
export async function runPublicSearch(stay: WebStay, userId: string) {
  if (
    !process.env.AI_API_KEY ||
    !(process.env.AI_WEB_SEARCH_MODEL || process.env.AI_MODEL)?.trim()
  )
    throw new WebSearchError(
      "search_not_configured",
      "Public-web search needs AI_API_KEY and a web-search-capable API model on the server.",
    );
  const allowed = await db.query(
    'INSERT INTO "WebSearchUsage" ("userId") VALUES ($1) ON CONFLICT ("userId") DO UPDATE SET count=CASE WHEN "WebSearchUsage"."windowStarted" < now()-interval \'10 minutes\' THEN 1 ELSE "WebSearchUsage".count+1 END,"windowStarted"=CASE WHEN "WebSearchUsage"."windowStarted" < now()-interval \'10 minutes\' THEN now() ELSE "WebSearchUsage"."windowStarted" END WHERE "WebSearchUsage"."windowStarted" < now()-interval \'10 minutes\' OR "WebSearchUsage".count<6 RETURNING count',
    [userId],
  );
  if (!allowed.rowCount)
    throw new WebSearchError(
      "search_limit",
      "Search limit reached. You can run six web searches per ten minutes.",
    );
  return searchPublicHotels(stay);
}
