import { z } from "zod";

const date = z.string().date();
export const bookingInput = z
  .object({
    hotelId: z.string().min(1),
    // Older clients send an empty custom name even when a listed hotel is selected.
    hotelName: z.preprocess(
      (value) =>
        typeof value === "string" && !value.trim() ? undefined : value,
      z.string().trim().min(2).max(200).optional(),
    ),
    providerHotelId: z
      .string()
      .regex(/^[A-Z0-9]{8}$/)
      .optional(),
    roomKey: z.string().max(1000).optional(),
    checkIn: date,
    checkOut: date,
    guests: z.number().int().min(1).max(12),
    roomDescription: z.string().trim().min(2).max(120),
    mealPlan: z.string().trim().min(2).max(80),
    originalTotal: z.number().positive().max(100000000),
    cancellationFee: z.number().nonnegative().max(100000000),
    cancellationBefore: z.string().datetime().nullable().optional(),
  })
  .superRefine((data, context) => {
    if (data.hotelId === "custom" && !data.hotelName)
      context.addIssue({
        code: "custom",
        path: ["hotelName"],
        message: "Enter the name of your hotel.",
      });
    if (data.checkOut <= data.checkIn)
      context.addIssue({
        code: "custom",
        path: ["checkOut"],
        message: "Check-out must be after check-in.",
      });
  });

const labels: Record<string, string> = {
  hotelId: "Hotel",
  hotelName: "Hotel name",
  providerHotelId: "Provider hotel",
  roomKey: "Room details",
  checkIn: "Check-in",
  checkOut: "Check-out",
  guests: "Guests",
  roomDescription: "Room type",
  mealPlan: "Meal plan",
  originalTotal: "Booked total",
  cancellationFee: "Cancellation fee",
  cancellationBefore: "Cancellation deadline",
};
export function bookingValidationError(error: z.ZodError) {
  const first = error.issues[0];
  const label = labels[String(first?.path[0])] || "Booking details";
  return {
    error: `${label}: ${first?.message || "Check this value and try again."}`,
    fields: z.flattenError(error).fieldErrors,
  };
}
