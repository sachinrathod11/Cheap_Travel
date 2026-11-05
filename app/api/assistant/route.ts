import { z } from "zod";
import { retrieve } from "@/lib/retrieval";
import {
  appGuide,
  appHelpAnswer,
  AssistantError,
  generateAppAnswer,
  searchActions,
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
  const sources = [appGuide, ...retrieved];
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
    return Response.json({
      ...result,
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
