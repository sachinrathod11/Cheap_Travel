import { bookingInput, bookingValidationError } from "@/lib/booking-input";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { store } from "@/lib/db";
import { hotels } from "@/lib/hotels";

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
    return NextResponse.json(bookingValidationError(parsed.error), {
      status: 400,
    });
  const data = parsed.data;
  const hotel = hotels.find((h) => h.id === data.hotelId);
  if (!hotel && !data.hotelName)
    return NextResponse.json(
      { error: "Enter the hotel name." },
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
    hotelId: hotel?.id || data.hotelId,
    hotelName: hotel?.name || data.hotelName,
    city: hotel?.city,
    providerHotelId: data.providerHotelId,
    roomKey: data.roomKey,
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
