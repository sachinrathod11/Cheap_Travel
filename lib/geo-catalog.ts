import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { LocationServiceError } from "@/lib/location-errors";
import { mappedHotels, referenceFor, type NearbyQuery } from "@/lib/geography";
export async function nearbyHotels(query: NearbyQuery) {
  const origin = referenceFor(query),
    key = createHash("sha256")
      .update(JSON.stringify([origin.lat, origin.lon, query.radiusKm]))
      .digest("hex");
  const cached = (
    await db.query(
      'SELECT payload,"fetchedAt" FROM "HotelGeoCache" WHERE id=$1',
      [key],
    )
  ).rows[0];
  let payload: unknown = cached?.payload,
    fetchedAt = cached?.fetchedAt,
    stale = false;
  if (
    !cached ||
    Date.now() - new Date(cached.fetchedAt).getTime() > 6 * 3600000
  ) {
    const client = await db.connect();
    let locked = false;
    try {
      locked = (
        await client.query("SELECT pg_try_advisory_lock(173731) AS locked")
      ).rows[0].locked;
      if (!locked) throw new LocationServiceError("map_busy", "The location service is busy. Retry shortly.");
      const q = `[out:json][timeout:25];nwr["tourism"~"^(hotel|motel|guest_house|hostel|apartment)$"](around:${query.radiusKm * 1000},${origin.lat},${origin.lon});out center;`;
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: q }),
        signal: AbortSignal.timeout(35000),
        cache: "no-store",
      }).catch((error: unknown) => {
        const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
        throw new LocationServiceError(timeout ? "map_timeout" : "map_connection_failed", timeout
          ? "The map service timed out. Retry with a smaller radius."
          : "The server could not connect to overpass-api.de. Check its network or proxy settings, then retry.");
      });
      if (!response.ok)
        throw new LocationServiceError(
          `map_http_${response.status}`,
          response.status === 403
            ? "Access to the map service was refused (HTTP 403). Check whether the server network allows overpass-api.de."
            : `The map service returned HTTP ${response.status}. Retry later or use a smaller radius.`,
        );
      const result = await response.json();
      if (result.remark)
        throw new LocationServiceError(
          "map_query_incomplete",
          "The map-data query was incomplete. Reduce the radius and try again.",
        );
      mappedHotels(result, origin, query.radiusKm); // Validate before retaining upstream data.
      fetchedAt = new Date().toISOString();
      payload = result;
      await client.query(
        'INSERT INTO "HotelGeoCache" (id,payload,"fetchedAt") VALUES ($1,$2,$3) ON CONFLICT (id) DO UPDATE SET payload=EXCLUDED.payload,"fetchedAt"=EXCLUDED."fetchedAt"',
        [key, JSON.stringify(payload), fetchedAt],
      );
    } catch (error) {
      if (!cached) throw error;
      stale = true;
    } finally {
      if (locked) await client.query("SELECT pg_advisory_unlock(173731)");
      client.release();
    }
  }
  const all = mappedHotels(payload, origin, query.radiusKm).filter(
      (h) =>
        (query.kind === "all" || h.kind === query.kind) &&
        (!query.minStars ||
          (h.stars !== null && Number(h.stars) >= query.minStars)) &&
        (!query.websiteOnly || Boolean(h.website)),
    ),
    pageSize = 40,
    start = (query.page - 1) * pageSize;
  return {
    origin,
    radiusKm: query.radiusKm,
    hotels: all.slice(start, start + pageSize),
    total: all.length,
    page: query.page,
    pageSize,
    hasMore: start + pageSize < all.length,
    fetchedAt,
    stale,
    coverage:
      "OpenStreetMap mapped accommodations; not an exhaustive hotel inventory.",
    distanceBasis:
      "Straight-line distance from an approximate reference point, not road distance or travel time.",
    attribution: "© OpenStreetMap contributors (ODbL)",
    priceCoverage:
      "Map data has no date-specific room prices. Budget is a preference for linked price research, not a verified price filter.",
  };
}
