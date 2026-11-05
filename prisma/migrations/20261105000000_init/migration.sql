CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Booking" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "hotelName" TEXT NOT NULL,
  "checkIn" DATE NOT NULL,
  "checkOut" DATE NOT NULL,
  "guests" INTEGER NOT NULL,
  "roomDescription" TEXT NOT NULL,
  "mealPlan" TEXT NOT NULL,
  "originalTotal" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "cancellationFee" INTEGER NOT NULL DEFAULT 0,
  "cancellationBefore" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Booking_userId_checkIn_idx" ON "Booking"("userId", "checkIn");
CREATE INDEX "Booking_hotelId_checkIn_checkOut_idx" ON "Booking"("hotelId", "checkIn", "checkOut");

CREATE TABLE "PriceSnapshot" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "total" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PriceSnapshot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PriceSnapshot_bookingId_capturedAt_idx" ON "PriceSnapshot"("bookingId", "capturedAt");
