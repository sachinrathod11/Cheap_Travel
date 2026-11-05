import { z } from "zod";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { store } from "@/lib/db";

const input = z.object({
  total: z.number().int().positive().max(100000000),
  provider: z.string().trim().min(2).max(80),
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in to update price history." },
      { status: 401 },
    );
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Enter a valid price and provider." },
      { status: 400 },
    );
  const { id } = await params;
  const owned = await store.ownsBooking(id, user.id);
  if (!owned)
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  const snapshot = await store.snapshots.create({
    data: {
      bookingId: id,
      total: parsed.data.total,
      provider: parsed.data.provider,
    },
  });
  return NextResponse.json({ snapshot }, { status: 201 });
}
