import { Pool, types, type PoolClient } from "pg";
import { randomUUID } from "node:crypto";

const globalForPool = globalThis as unknown as { pool?: Pool };
types.setTypeParser(1700, Number);
types.setTypeParser(1082, (value) => value);
export const db =
  globalForPool.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    max: 10,
  });
if (process.env.NODE_ENV !== "production") globalForPool.pool = db;

const snapshots = {
  async create({
    data,
  }: {
    data: { bookingId: string; total: number; provider: string };
  }) {
    const result = await db.query(
      'INSERT INTO "PriceSnapshot" ("id", "bookingId", "total", "provider") VALUES ($1, $2, $3, $4) RETURNING *',
      [randomUUID(), data.bookingId, data.total, data.provider],
    );
    return result.rows[0];
  },
};

export const store = {
  async createUser(email: string, passwordHash: string) {
    const result = await db.query(
      'INSERT INTO "User" ("id", "email", "passwordHash") VALUES ($1, $2, $3) RETURNING "id", "email"',
      [randomUUID(), email, passwordHash],
    );
    return result.rows[0];
  },
  async findUserByEmail(email: string) {
    const result = await db.query(
      'SELECT "id", "email", "passwordHash" FROM "User" WHERE "email" = $1',
      [email],
    );
    return result.rows[0] ?? null;
  },
  async findUserById(id: string) {
    const result = await db.query(
      'SELECT "id", "email" FROM "User" WHERE "id" = $1',
      [id],
    );
    return result.rows[0] ?? null;
  },
  async listBookings(userId: string) {
    const result = await db.query(
      'SELECT b.*, COALESCE(json_agg(s ORDER BY s."capturedAt" DESC) FILTER (WHERE s."id" IS NOT NULL), \'[]\') AS "snapshots" FROM "Booking" b LEFT JOIN "PriceSnapshot" s ON s."bookingId" = b."id" WHERE b."userId" = $1 GROUP BY b."id" ORDER BY b."checkIn" ASC',
      [userId],
    );
    return result.rows.map((row) => ({
      ...row,
      snapshots: row.snapshots.slice(0, 10),
    }));
  },
  async createBooking(
    data: Record<string, unknown>,
    transactionClient?: PoolClient,
  ) {
    const id = randomUUID();
    const client = transactionClient ?? (await db.connect());
    try {
      if (!transactionClient) await client.query("BEGIN");
      const result = await client.query(
        'INSERT INTO "Booking" ("id", "userId", "hotelId", "hotelName", "checkIn", "checkOut", "guests", "roomDescription", "mealPlan", "originalTotal", "cancellationFee", "cancellationBefore", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now()) RETURNING *',
        [
          id,
          data.userId,
          data.hotelId,
          data.hotelName,
          data.checkIn,
          data.checkOut,
          data.guests,
          data.roomDescription,
          data.mealPlan,
          data.originalTotal,
          data.cancellationFee,
          data.cancellationBefore,
        ],
      );
      await client.query(
        'UPDATE "Booking" SET "providerHotelId"=$2,"roomKey"=$3,"monitoringEnabled"=$4,city=$5,"sourceUrl"=$6 WHERE id=$1',
        [
          id,
          data.providerHotelId || null,
          data.roomKey || null,
          Boolean(data.providerHotelId && data.roomKey),
          data.city || null,
          data.sourceUrl || null,
        ],
      );
      await client.query(
        'INSERT INTO "PriceSnapshot" ("id", "bookingId", "total", "provider") VALUES ($1,$2,$3,$4)',
        [randomUUID(), id, data.originalTotal, "Your booking"],
      );
      const booking = {
        ...result.rows[0],
        providerHotelId: data.providerHotelId || null,
        monitoringEnabled: Boolean(data.providerHotelId && data.roomKey),
        city: data.city || null,
        sourceUrl: data.sourceUrl || null,
        snapshots: await client
          .query('SELECT * FROM "PriceSnapshot" WHERE "bookingId"=$1', [id])
          .then((v) => v.rows),
      };
      if (!transactionClient) await client.query("COMMIT");
      return booking;
    } catch (error) {
      if (!transactionClient) await client.query("ROLLBACK");
      throw error;
    } finally {
      if (!transactionClient) client.release();
    }
  },
  async ownsBooking(id: string, userId: string) {
    const result = await db.query(
      'SELECT "id" FROM "Booking" WHERE "id"=$1 AND "userId"=$2',
      [id, userId],
    );
    return Boolean(result.rows[0]);
  },
  snapshots,
};
