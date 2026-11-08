import { randomUUID } from "node:crypto";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { handoffInput } from "@/lib/handoff-input";
export async function GET() {
  const user = await getUser();
  if (!user)
    return Response.json(
      { error: "Sign in to view saved hotel visits." },
      { status: 401 },
    );
  const { rows } = await db.query(
    'SELECT h.*,b."originalTotal" AS "bookedTotal" FROM "BookingHandoff" h LEFT JOIN "Booking" b ON b.id=h."bookingId" WHERE h."userId"=$1 AND h.status<>\'dismissed\' ORDER BY CASE WHEN h.status IN (\'pending\',\'opened\') THEN 0 ELSE 1 END,h."createdAt" DESC LIMIT 50',
    [user.id],
  );
  const count = await db.query(
    "SELECT count(*) AS count FROM \"BookingHandoff\" WHERE \"userId\"=$1 AND status IN ('pending','opened')",
    [user.id],
  );
  return Response.json(
    { visits: rows, pendingCount: Number(count.rows[0].count) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(request: Request) {
  const user = await getUser();
  if (!user)
    return Response.json(
      { error: "Sign in to save a hotel visit before leaving the app." },
      { status: 401 },
    );
  const parsed = handoffInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      {
        error:
          parsed.error.issues[0]?.message ||
          "Check the hotel and stay details.",
      },
      { status: 400 },
    );
  const v = parsed.data,
    id = randomUUID();
  await db.query(
    'INSERT INTO "BookingHandoff" (id,"userId","hotelName","targetUrl",city,"catalogId","referenceId","radiusKm","quotedTotal","checkIn","checkOut",guests) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
    [
      id,
      user.id,
      v.hotelName,
      v.targetUrl,
      v.city,
      v.catalogId || null,
      v.referenceId || null,
      v.radiusKm || null,
      v.quotedTotal,
      v.checkIn,
      v.checkOut,
      v.guests,
    ],
  );
  return Response.json(
    { id, openUrl: `/outbound/${id}`, status: "pending" },
    { status: 201 },
  );
}
