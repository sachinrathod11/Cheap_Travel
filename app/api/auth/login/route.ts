import { compare } from "bcryptjs";
import { z } from "zod";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { store } from "@/lib/db";

const input = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});
export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Enter your email and password." },
      { status: 400 },
    );
  try {
    const user = await store.findUserByEmail(
      parsed.data.email.trim().toLowerCase(),
    );
    if (!user || !(await compare(parsed.data.password, user.passwordHash)))
      return NextResponse.json(
        { error: "Email or password is incorrect." },
        { status: 401 },
      );
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch {
    return NextResponse.json(
      { error: "Account service is unavailable." },
      { status: 503 },
    );
  }
}
