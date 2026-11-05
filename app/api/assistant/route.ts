import { z } from "zod";
import { retrieve } from "@/lib/retrieval";
import {
  appGuide,
  generateAppAnswer,
  isAppQuestion,
  scopeReply,
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
  const fallback = isAppQuestion(question)
    ? {
        answer: retrieved.length
          ? retrieved.map((s) => `${s.title}: ${s.text}`).join("\n\n")
          : appGuide.text,
        sources,
      }
    : { answer: scopeReply, sources: [] };
  if (!process.env.AI_API_KEY || !process.env.AI_MODEL?.trim())
    return Response.json({
      ...fallback,
      mode: "retrieval-only",
      notice:
        "AI generation requires a server API key and an accessible AI_MODEL. Showing Cheap Travel help only.",
    });
  try {
    return Response.json(await generateAppAnswer(question, sources, history));
  } catch {
    return Response.json({
      ...fallback,
      mode: "retrieval-only",
      notice:
        "AI generation failed. Check the model ID, reasoning support, API access and quota. Showing Cheap Travel help only.",
    });
  }
}
