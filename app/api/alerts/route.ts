import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
export async function GET() {
  const user = await getUser();
  if (!user)
    return Response.json({ error: "Sign in to view alerts." }, { status: 401 });
  const { rows } = await db.query(
    'SELECT a.*,b."hotelName",b.currency FROM "PriceAlert" a JOIN "Booking" b ON b.id=a."bookingId" WHERE b."userId"=$1 ORDER BY a."createdAt" DESC LIMIT 50',
    [user.id],
  );
  return Response.json({ alerts: rows });
}
