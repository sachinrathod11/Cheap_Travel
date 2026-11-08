import { z } from "zod";
import { publicWebsite } from "./public-url.ts";
import { bookingInput } from "./booking-input.ts";
export const handoffInput = z
  .object({
    hotelName: z.string().trim().min(2).max(200),
    targetUrl: z
      .string()
      .max(2048)
      .refine(
        (v) => Boolean(publicWebsite(v)),
        "Use a public HTTPS hotel/provider page without personal session or credential parameters.",
      )
      .transform((v) => publicWebsite(v)!),
    city: z.string().trim().min(2).max(200),
    catalogId: z.string().max(80).optional(),
    referenceId: z.string().max(80).optional(),
    radiusKm: z.number().min(1).max(50).optional(),
    quotedTotal: z.number().positive().max(100000000).nullable().default(null),
    checkIn: z.string().date(),
    checkOut: z.string().date(),
    guests: z.number().int().min(1).max(12),
    consent: z.literal(true),
  })
  .refine((v) => v.checkOut > v.checkIn, {
    message: "Check-out must be after check-in.",
    path: ["checkOut"],
  });
export const handoffConfirmation = z.object({
  confirmed: z.literal(true),
  booking: bookingInput,
});
