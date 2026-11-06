import { getUser } from "@/lib/auth";
import { runPublicSearch } from "@/lib/web-search-runner";
import { webSearchInput, WebSearchError } from "@/lib/web-search";
export const maxDuration = 120;
export async function POST(request: Request) {
  const user = await getUser();
  if (!user)
    return Response.json(
      { error: "Sign in to search public hotel pages." },
      { status: 401 },
    );
  const parsed = webSearchInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: "Enter a destination, future stay dates and 1–8 adults." },
      { status: 400 },
    );
  try {
    return Response.json(await runPublicSearch(parsed.data, user.id));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof WebSearchError
            ? error.message
            : "Web search could not start. Check database setup and provider access.",
        code:
          error instanceof WebSearchError ? error.code : "search_unavailable",
      },
      {
        status:
          error instanceof WebSearchError && error.code === "search_limit"
            ? 429
            : 503,
      },
    );
  }
}
