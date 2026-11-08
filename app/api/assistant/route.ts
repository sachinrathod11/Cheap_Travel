import { z } from "zod";
import { retrieve } from "@/lib/retrieval";
import { getUser } from "@/lib/auth";
import { runPublicSearch } from "@/lib/web-search-runner";
import { webSearchInput, WebSearchError } from "@/lib/web-search";
export const maxDuration = 180;
import {
  appGuide,
  webSearchGuide,
  locationGuide,
  appHelpAnswer,
  AssistantError,
  generateAppAnswer,
  searchActions,
  nearbyAction,
} from "@/lib/assistant";
const input = z.object({
  question: z.string().trim().min(1).max(2000),
  hotelId: z.string().max(100).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(1000),
      }),
    )
    .max(6)
    .default([]),
});
export async function GET() {
  return Response.json({
    configured: Boolean(process.env.AI_API_KEY && process.env.AI_MODEL?.trim()),
    configurationOnly: true,
    reasoningEffort: process.env.AI_REASONING_EFFORT || "provider-default",
    scope: "cheap-travel-only",
  });
}
export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Ask a question under 2,000 characters." },
      { status: 400 },
    );
  const { question, hotelId, history } = parsed.data;
  const retrieved = await retrieve(question, hotelId);
  const sources = [appGuide, webSearchGuide, locationGuide, ...retrieved];
  const fallback = appHelpAnswer(question, sources);
  if (!process.env.AI_API_KEY || !process.env.AI_MODEL?.trim())
    return Response.json({
      ...fallback,
      mode: "retrieval-only",
      notice:
        "AI is not connected: set AI_API_KEY and an accessible AI_MODEL on the server. This reply is app help.",
      diagnosticCode: "configuration_missing",
    });
  try {
    const result = await generateAppAnswer(question, sources, history);
    if (result.mode === "ai-retrieval" && result.searchRequest) {
      const stay = webSearchInput.safeParse(result.searchRequest);
      if (!stay.success)
        return Response.json({
          answer:
            "Please confirm the destination, future check-in/check-out dates (including the year), and 1–8 adults so I can search accurately.",
          sources: [],
          actions: searchActions(question),
          mode: "app-help",
        });
      const location = nearbyAction(
        stay.data.destination,
        [
          ...history
            .filter((m) => m.role === "user")
            .slice(-2)
            .map((m) => m.content),
          question,
        ].join(" "),
        stay.data,
      );
      if (location)
        return Response.json({
          answer:
            "Use the nearby-hotel locator to choose the correct airport, railway station or map point and apply an actual distance boundary. Public web snippets alone do not establish that a hotel is inside your radius.",
          sources: [],
          actions: [location],
          mode: "app-help",
        });
      const user = await getUser();
      if (!user)
        return Response.json({
          answer:
            "Please sign in to run public hotel searches. Your search must include the destination, dates and adult count.",
          sources: [],
          actions: [{ label: "Sign in", href: "/account" }],
          mode: "app-help",
        });
      try {
        const webResult = await runPublicSearch(stay.data, user.id);
        return Response.json({
          answer: webResult.answer,
          webResult,
          sources: [],
          actions: [],
          mode: "web-search",
        });
      } catch (error) {
        const problem =
          error instanceof WebSearchError
            ? error
            : new WebSearchError(
                "search_unavailable",
                "Search could not start. Check database migrations and provider access.",
              );
        return Response.json({
          answer:
            "I could not complete the public hotel search. No current rates have been verified.",
          notice: problem.message,
          diagnosticCode: problem.code,
          sources: [],
          actions: searchActions(question),
          mode: "search-unavailable",
        });
      }
    }
    return Response.json({
      answer: result.answer,
      sources: result.sources,
      mode: result.mode,
      actions: result.mode === "ai-retrieval" ? searchActions(question) : [],
    });
  } catch (error) {
    const problem =
      error instanceof AssistantError
        ? error
        : new AssistantError(
            "unexpected_response",
            "The AI response could not be read. Run npm run ai:check for a connection check.",
          );
    return Response.json({
      ...fallback,
      mode: "retrieval-only",
      notice: `AI is offline [${problem.code}]: ${problem.message} This reply is app help.`,
      diagnosticCode: problem.code,
    });
  }
}
