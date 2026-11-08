import { getUser } from "@/lib/auth";
import { db, store } from "@/lib/db";
import { handoffConfirmation } from "@/lib/handoff-input";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (body?.action === "dismiss") {
    const r = await db.query(
      "UPDATE \"BookingHandoff\" SET status='dismissed' WHERE id=$1 AND \"userId\"=$2 AND status<>'confirmed' RETURNING id",
      [id, user.id],
    );
    return r.rowCount
      ? Response.json({ ok: true })
      : Response.json({ error: "Pending visit not found." }, { status: 404 });
  }
  const parsed = handoffConfirmation.safeParse(body);
  if (!parsed.success)
    return Response.json(
      {
        error:
          parsed.error.issues[0]?.message ||
          "Confirm what you booked and enter the paid total.",
      },
      { status: 400 },
    );
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const row = (
      await client.query(
        'SELECT * FROM "BookingHandoff" WHERE id=$1 AND "userId"=$2 FOR UPDATE',
        [id, user.id],
      )
    ).rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return Response.json(
        { error: "Saved visit not found." },
        { status: 404 },
      );
    }
    if (row.status === "confirmed") {
      await client.query("COMMIT");
      return row.bookingId
        ? Response.json({ bookingId: row.bookingId, alreadyConfirmed: true })
        : Response.json(
            {
              error:
                "The tracked booking was removed. Add a new booking manually if needed.",
            },
            { status: 409 },
          );
    }
    if (row.status === "dismissed") {
      await client.query("ROLLBACK");
      return Response.json(
        {
          error:
            "This visit was dismissed. Open the hotel link again before confirming.",
        },
        { status: 409 },
      );
    }
    const v = parsed.data.booking;
    const booking = await store.createBooking(
      {
        ...v,
        userId: user.id,
        hotelId: `handoff:${id}`,
        hotelName: row.hotelName,
        city: row.city,
        sourceUrl: row.targetUrl,
        providerHotelId: undefined,
        roomKey: undefined,
        cancellationBefore: v.cancellationBefore
          ? new Date(v.cancellationBefore)
          : null,
      },
      client,
    );
    await client.query(
      'UPDATE "BookingHandoff" SET status=\'confirmed\',"confirmedAt"=now(),"bookingId"=$2 WHERE id=$1',
      [id, booking.id],
    );
    await client.query("COMMIT");
    return Response.json(
      { bookingId: booking.id, alreadyConfirmed: false },
      { status: 201 },
    );
  } catch {
    await client.query("ROLLBACK");
    return Response.json(
      {
        error:
          "Could not save the confirmed booking. Retry without resubmitting payment.",
      },
      { status: 503 },
    );
  } finally {
    client.release();
  }
}
