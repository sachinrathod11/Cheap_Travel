ALTER TABLE "Booking" ADD COLUMN "providerHotelId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "roomKey" TEXT;
ALTER TABLE "Booking" ADD COLUMN "lastCheckedAt" TIMESTAMPTZ;
ALTER TABLE "Booking" ADD COLUMN "checkError" TEXT;
ALTER TABLE "Booking" ADD COLUMN "monitoringEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ALTER COLUMN "originalTotal" TYPE NUMERIC(14,2);
ALTER TABLE "Booking" ALTER COLUMN "cancellationFee" TYPE NUMERIC(14,2);
ALTER TABLE "PriceSnapshot" ALTER COLUMN total TYPE NUMERIC(14,2);
CREATE TABLE "PriceAlert" (
  id TEXT PRIMARY KEY,
  "bookingId" TEXT NOT NULL REFERENCES "Booking"(id) ON DELETE CASCADE,
  "offerId" TEXT NOT NULL,
  total NUMERIC(14,2) NOT NULL,
  savings NUMERIC(14,2) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "readAt" TIMESTAMPTZ,
  UNIQUE ("bookingId", total)
);
CREATE TABLE "KnowledgeDocument" (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX knowledge_search_idx ON "KnowledgeDocument" USING GIN (to_tsvector('english', title || ' ' || content));
INSERT INTO "KnowledgeDocument" (id,title,content,source) VALUES
('rebooking','How to evaluate rebooking','Compare the same hotel, dates, guest count, number of rooms, room type, bed configuration, meals, currency, taxes and cancellation terms. Net saving is original total minus replacement total minus cancellation fee. Confirm the replacement reservation before cancelling the original. Prices and availability can change before checkout.','Cheap Travel rebooking guide'),
('cancellation','Cancellation windows and fees','Refundable rates have a deadline and may have penalties. A free cancellation deadline is not the check-in date. Use the timezone specified by the booking provider. If the deadline has passed, verify the current penalty before claiming a saving. Never infer real cancellation rules from sample hotel policies.','Cheap Travel cancellation guide'),
('travel-planning','Planning a hotel stay','Choose dates, guests and budget first. Compare full-stay totals including taxes and mandatory fees. Check travel distance, accessibility, room amenities, meals, cancellation conditions and recent reviews. Keep booking confirmations and contact information. Verify entry requirements with the destination government and current transport details with the operator.','Cheap Travel planning guide'),
('coverage','Price coverage and availability','Cheap Travel’s Amadeus integration returns offers available through that provider. It does not compare every online travel agency. Amadeus test credentials use test inventory; production access is needed for current market availability. A displayed quote is not a reservation or a guarantee.','Cheap Travel provider guide');
