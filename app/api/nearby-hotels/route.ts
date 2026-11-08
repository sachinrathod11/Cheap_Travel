import { nearbyInput } from "@/lib/geography";
import { nearbyHotels } from "@/lib/geo-catalog";
import { locationFailure } from "@/lib/location-errors";
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
  } catch (error) {
    const failure = locationFailure(error);
    // Log codes only: database error messages can contain private connection details.
    console.error("Nearby hotels failed", failure.code, (error as { code?: string } | null)?.code || "");
    return Response.json(
      {
        ...failure,
      },
      { status: 503 },
    );
  }
}
