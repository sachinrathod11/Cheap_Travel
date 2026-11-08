CREATE TABLE "HotelGeoCache" (id TEXT PRIMARY KEY,payload JSONB NOT NULL,"fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE "Booking" ADD COLUMN city TEXT;
ALTER TABLE "Booking" ADD COLUMN "sourceUrl" TEXT;
CREATE TABLE "BookingHandoff" (
 id TEXT PRIMARY KEY,"userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
 "hotelName" TEXT NOT NULL,"targetUrl" TEXT NOT NULL,city TEXT NOT NULL,"catalogId" TEXT,"quotedTotal" NUMERIC(14,2),
 "referenceId" TEXT,"radiusKm" NUMERIC(6,2),
 "checkIn" DATE NOT NULL,"checkOut" DATE NOT NULL,guests INTEGER NOT NULL CHECK(guests BETWEEN 1 AND 12),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','opened','confirmed','dismissed')),
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),"openedAt" TIMESTAMPTZ,"lastOpenedAt" TIMESTAMPTZ,"openCount" INTEGER NOT NULL DEFAULT 0,
 "confirmedAt" TIMESTAMPTZ,"bookingId" TEXT UNIQUE REFERENCES "Booking"(id) ON DELETE SET NULL
);
CREATE INDEX handoff_owner_status_idx ON "BookingHandoff"("userId",status,"createdAt");
