import { z } from "zod";

export const searchInput = z
  .object({
    cityCode: z.string().regex(/^[A-Z]{3}$/),
    checkIn: z.string().date(),
    checkOut: z.string().date(),
    adults: z.coerce.number().int().min(1).max(8),
    currency: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR"),
  })
  .refine(
    (v) =>
      v.checkIn >= new Date().toISOString().slice(0, 10) &&
      v.checkOut > v.checkIn,
    { message: "Choose future dates with check-out after check-in." },
  );
export type Search = z.infer<typeof searchInput>;
export type Quote = {
  id: string;
  hotelId: string;
  hotelName: string;
  room: string;
  roomKey: string;
  mealPlan: string;
  total: number;
  currency: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  cancellation: unknown;
  chargesComplete?: boolean;
  fetchedAt: string;
  mode: "test" | "production";
};
export class ProviderError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}
let token: { value: string; expires: number } | undefined;
const base = () =>
  process.env.AMADEUS_ENV === "production"
    ? "https://api.amadeus.com"
    : "https://test.api.amadeus.com";
async function accessToken() {
  if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET)
    throw new ProviderError(
      "Hotel search needs Amadeus credentials. Add AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET to your server environment.",
      503,
    );
  if (token && token.expires > Date.now()) return token.value;
  const r = await fetch(`${base()}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.AMADEUS_CLIENT_ID,
      client_secret: process.env.AMADEUS_CLIENT_SECRET,
    }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!r.ok)
    throw new ProviderError(
      "Hotel provider authentication failed. Check your credentials and selected environment.",
      503,
    );
  const data = await r.json();
  token = {
    value: data.access_token,
    expires: Date.now() + Math.max(0, Number(data.expires_in) - 60) * 1000,
  };
  return token.value;
}
async function get(path: string) {
  const r = await fetch(`${base()}${path}`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) {
    if (r.status === 401) token = undefined;
    throw new ProviderError(
      r.status === 429
        ? "Hotel provider rate limit reached. Try again later."
        : "The hotel provider could not complete this search. Try another date or destination.",
    );
  }
  return r.json();
}
// A room key requires structured room and meal data; missing data never matches.
export function roomKey(
  room: {
    type?: string;
    typeEstimated?: { category?: string; beds?: number; bedType?: string };
  },
  boardType?: string,
) {
  if (
    !room?.type ||
    !room.typeEstimated?.category ||
    !room.typeEstimated?.bedType ||
    !room.typeEstimated?.beds ||
    !boardType
  )
    return "";
  return JSON.stringify([
    room.type,
    room.typeEstimated.category,
    room.typeEstimated.beds,
    room.typeEstimated.bedType,
    boardType,
  ]);
}
export async function hotelOffers(
  hotelIds: string[],
  query: Omit<Search, "cityCode">,
): Promise<Quote[]> {
  const params = new URLSearchParams({
    hotelIds: hotelIds.join(","),
    adults: String(query.adults),
    checkInDate: query.checkIn,
    checkOutDate: query.checkOut,
    currency: query.currency,
    roomQuantity: "1",
    bestRateOnly: "false",
  });
  const result = await get(`/v3/shopping/hotel-offers?${params}`);
  const quotes: Quote[] = [];
  for (const entry of result.data || [])
    for (const offer of entry.offers || []) {
      const total = Number(offer.price?.total);
      if (
        !Number.isFinite(total) ||
        total <= 0 ||
        offer.price?.currency !== query.currency ||
        offer.checkInDate !== query.checkIn ||
        offer.checkOutDate !== query.checkOut
      )
        continue;
      quotes.push({
        id: offer.id,
        hotelId: entry.hotel.hotelId,
        hotelName: entry.hotel.name,
        room:
          offer.room?.description?.text ||
          offer.room?.type ||
          "Room details unavailable",
        roomKey: roomKey(offer.room || {}, offer.boardType),
        mealPlan: offer.boardType || "Not specified",
        total,
        currency: offer.price.currency,
        checkIn: offer.checkInDate,
        checkOut: offer.checkOutDate,
        adults: query.adults,
        cancellation: offer.policies || null,
        fetchedAt: new Date().toISOString(),
        mode: process.env.AMADEUS_ENV === "production" ? "production" : "test",
      });
      quotes[quotes.length - 1].chargesComplete =
        Array.isArray(offer.price.taxes) &&
        offer.price.taxes.length > 0 &&
        offer.price.taxes.every(
          (t: { included?: boolean }) => t.included === true,
        );
    }
  return quotes.sort((a, b) => a.total - b.total);
}
export async function searchHotels(query: Search) {
  const locations = await get(
    `/v1/reference-data/locations/hotels/by-city?cityCode=${query.cityCode}&radius=10&radiusUnit=KM`,
  );
  const ids: string[] = (locations.data || [])
    .slice(0, 20)
    .map((h: { hotelId: string }) => h.hotelId);
  if (!ids.length) return [];
  return hotelOffers(ids, query);
}
