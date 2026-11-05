import { hash } from "bcryptjs";
import { z } from "zod";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { store } from "@/lib/db";

const input = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(128),
});
export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "Enter a valid email and a password of at least 12 characters.",
      },
      { status: 400 },
    );
  const email = parsed.data.email.trim().toLowerCase();
  try {
    const user = await store.createUser(
      email,
      await hash(parsed.data.password, 12),
    );
    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    )
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    return NextResponse.json(
      { error: "Account service is unavailable." },
      { status: 503 },
    );
  }
}
