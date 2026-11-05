import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const result = await db.query(
    'DELETE FROM "Booking" WHERE id=$1 AND "userId"=$2',
    [id, user.id],
  );
  if (!result.rowCount)
    return Response.json({ error: "Booking not found." }, { status: 404 });
  return Response.json({ ok: true });
}
