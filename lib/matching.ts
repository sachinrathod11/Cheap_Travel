import type { Quote } from "./provider";
export type MatchBooking = {
  roomKey: string;
  currency: string;
  originalTotal: number;
  cancellationFee: number;
  cancellationBefore: Date | null;
};
export function candidateSaving(
  booking: MatchBooking,
  quote: Quote,
  now = new Date(),
) {
  if (
    quote.mode !== "production" ||
    !quote.chargesComplete ||
    !booking.roomKey ||
    quote.roomKey !== booking.roomKey ||
    quote.currency !== booking.currency
  )
    return 0;
  if (
    !booking.cancellationBefore ||
    !Number.isFinite(new Date(booking.cancellationBefore).getTime()) ||
    new Date(booking.cancellationBefore) <= now
  )
    return 0;
  return Math.max(
    0,
    Math.round(
      (Number(booking.originalTotal) -
        quote.total -
        Number(booking.cancellationFee)) *
        100,
    ) / 100,
  );
}
