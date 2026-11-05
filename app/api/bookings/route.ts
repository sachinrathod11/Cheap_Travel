import { z } from "zod";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { store } from "@/lib/db";
import { hotels } from "@/lib/hotels";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => !Number.isNaN(Date.parse(v)));
const bookingInput = z.object({
  hotelId: z.string().min(1),
  checkIn: date,
  checkOut: date,
  guests: z.number().int().min(1).max(12),
  roomDescription: z.string().trim().min(2).max(120),
  mealPlan: z.string().trim().min(2).max(80),
  originalTotal: z.number().int().positive().max(100000000),
  cancellationFee: z.number().int().nonnegative().max(100000000),
  cancellationBefore: z.string().datetime().nullable().optional(),
});

export async function GET() {
  const user = await getUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in to view tracked bookings." },
      { status: 401 },
    );
  const bookings = await store.listBookings(user.id);
  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in to track a booking." },
      { status: 401 },
    );
  const parsed = bookingInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the booking details and try again." },
      { status: 400 },
    );
  const data = parsed.data;
  const hotel = hotels.find((h) => h.id === data.hotelId);
  if (!hotel)
    return NextResponse.json(
      { error: "Choose a supported hotel." },
      { status: 400 },
    );
  const checkIn = new Date(`${data.checkIn}T00:00:00.000Z`);
  const checkOut = new Date(`${data.checkOut}T00:00:00.000Z`);
  if (checkOut <= checkIn)
    return NextResponse.json(
      { error: "Check-out must be after check-in." },
      { status: 400 },
    );
  const booking = await store.createBooking({
    userId: user.id,
    hotelId: hotel.id,
    hotelName: hotel.name,
    checkIn,
    checkOut,
    guests: data.guests,
    roomDescription: data.roomDescription,
    mealPlan: data.mealPlan,
    originalTotal: data.originalTotal,
    cancellationFee: data.cancellationFee,
    cancellationBefore: data.cancellationBefore
      ? new Date(data.cancellationBefore)
      : null,
  });
  return NextResponse.json({ booking }, { status: 201 });
}
