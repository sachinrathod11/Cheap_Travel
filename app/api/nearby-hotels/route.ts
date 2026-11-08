import { nearbyInput } from "@/lib/geography";
import { nearbyHotels } from "@/lib/geo-catalog";
export const maxDuration = 60;
export async function GET(request: Request) {
  const q = nearbyInput.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!q.success)
    return Response.json(
      {
        error:
          "Choose Goa or Jaipur, a valid reference point, and a radius of 1–50 km.",
      },
      { status: 400 },
    );
  try {
    return Response.json(await nearbyHotels(q.data));
  } catch {
    return Response.json(
      {
        error:
          "Location discovery is unavailable. Check database migrations, allow overpass-api.de from the server, or retry with a smaller radius. No sample hotels have been substituted.",
      },
      { status: 503 },
    );
  }
}
