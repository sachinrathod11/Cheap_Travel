import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { hotelOffers, Quote } from "@/lib/provider";
import { candidateSaving } from "@/lib/matching";

type Tracked = {
  id: string;
  providerHotelId: string;
  roomKey: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  currency: string;
  originalTotal: number;
  cancellationFee: number;
  cancellationBefore: Date | null;
};
export async function monitorBookings(userId?: string) {
  const client = await db.connect();
  let locked = false;
  const summary = { checked: 0, alerts: 0, failed: 0, busy: false };
  try {
    locked = (
      await client.query("SELECT pg_try_advisory_lock(173730) AS locked")
    ).rows[0].locked;
    if (!locked) return { ...summary, busy: true };
    const { rows } = await client.query(
      'SELECT * FROM "Booking" WHERE "monitoringEnabled"=true AND "providerHotelId" IS NOT NULL AND "checkIn">CURRENT_DATE AND ($1::text IS NULL OR "userId"=$1) AND ("lastCheckedAt" IS NULL OR "lastCheckedAt" < now() - interval \'30 minutes\') ORDER BY "lastCheckedAt" ASC NULLS FIRST LIMIT 10',
      [userId || null],
    );
    for (const b of rows as Tracked[]) {
      try {
        const quotes = await hotelOffers([b.providerHotelId], {
          checkIn: new Date(b.checkIn).toISOString().slice(0, 10),
          checkOut: new Date(b.checkOut).toISOString().slice(0, 10),
          adults: b.guests,
          currency: b.currency as "INR",
        });
        const equivalent = quotes.find(
          (q) => q.roomKey && q.roomKey === b.roomKey,
        );
        await client.query("BEGIN");
        if (equivalent) {
          await client.query(
            'INSERT INTO "PriceSnapshot" (id,"bookingId",total,provider) VALUES ($1,$2,$3,$4)',
            [
              randomUUID(),
              b.id,
              equivalent.total,
              `Amadeus (${equivalent.mode})`,
            ],
          );
          const saving = candidateSaving(b, equivalent);
          if (saving > 0) {
            const inserted = await client.query(
              'INSERT INTO "PriceAlert" (id,"bookingId","offerId",total,savings) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
              [randomUUID(), b.id, equivalent.id, equivalent.total, saving],
            );
            summary.alerts += inserted.rowCount || 0;
          }
        }
        await client.query(
          'UPDATE "Booking" SET "lastCheckedAt"=now(), "checkError"=$2 WHERE id=$1',
          [b.id, equivalent ? null : "No equivalent room offer available."],
        );
        await client.query("COMMIT");
        summary.checked++;
      } catch {
        await client.query("ROLLBACK");
        await client.query(
          'UPDATE "Booking" SET "lastCheckedAt"=now(),"checkError"=$2 WHERE id=$1',
          [
            b.id,
            "Price check failed. Verify provider configuration and try again later.",
          ],
        );
        summary.failed++;
      }
    }
    return summary;
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock(173730)");
    client.release();
  }
}
