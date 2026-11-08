import { z } from "zod";
import { publicWebsite } from "./public-url.ts";
export type Region = "goa" | "jaipur";
export type ReferencePoint = {
  id: string;
  region: Region;
  name: string;
  kind: "airport" | "railway" | "area";
  lat: number;
  lon: number;
};
// Approximate map reference points, not terminal entrances or road-route origins.
export const references: ReferencePoint[] = [
  {
    id: "goi",
    region: "goa",
    name: "Goa Dabolim Airport (GOI)",
    kind: "airport",
    lat: 15.3808,
    lon: 73.8314,
  },
  {
    id: "gox",
    region: "goa",
    name: "Manohar International Airport, Mopa (GOX)",
    kind: "airport",
    lat: 15.7443,
    lon: 73.8606,
  },
  {
    id: "madgaon",
    region: "goa",
    name: "Madgaon railway station",
    kind: "railway",
    lat: 15.2675,
    lon: 73.958,
  },
  {
    id: "thivim",
    region: "goa",
    name: "Thivim railway station",
    kind: "railway",
    lat: 15.6197,
    lon: 73.8768,
  },
  {
    id: "panaji",
    region: "goa",
    name: "Panaji",
    kind: "area",
    lat: 15.4909,
    lon: 73.8278,
  },
  {
    id: "calangute",
    region: "goa",
    name: "Calangute",
    kind: "area",
    lat: 15.544,
    lon: 73.755,
  },
  {
    id: "colva",
    region: "goa",
    name: "Colva",
    kind: "area",
    lat: 15.2795,
    lon: 73.922,
  },
  {
    id: "jai",
    region: "jaipur",
    name: "Jaipur International Airport (JAI)",
    kind: "airport",
    lat: 26.8242,
    lon: 75.8122,
  },
  {
    id: "jaipur-junction",
    region: "jaipur",
    name: "Jaipur Junction railway station",
    kind: "railway",
    lat: 26.9206,
    lon: 75.7862,
  },
  {
    id: "pink-city",
    region: "jaipur",
    name: "Jaipur Pink City / City Palace area",
    kind: "area",
    lat: 26.9258,
    lon: 75.8237,
  },
];
export const nearbyInput = z
  .object({
    region: z.enum(["goa", "jaipur"]),
    referenceId: z.string().min(1).max(80),
    radiusKm: z.coerce.number().min(1).max(50),
    customLat: z.coerce.number().min(-90).max(90).optional(),
    customLon: z.coerce.number().min(-180).max(180).optional(),
    page: z.coerce.number().int().min(1).max(250).default(1),
    kind: z
      .enum(["all", "hotel", "motel", "guest_house", "hostel", "apartment"])
      .default("all"),
    minStars: z.coerce.number().int().min(0).max(5).default(0),
    websiteOnly: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
  })
  .superRefine((v, c) => {
    if (v.referenceId === "custom") {
      if (v.customLat === undefined || v.customLon === undefined)
        c.addIssue({ code: "custom", message: "Enter both map coordinates." });
      else if (!inRegion(v.region, v.customLat, v.customLon))
        c.addIssue({
          code: "custom",
          message: "Choose a map point in the selected search region.",
        });
    } else if (
      !references.some((r) => r.id === v.referenceId && r.region === v.region)
    )
      c.addIssue({
        code: "custom",
        message: "Choose a reference point in the selected region.",
      });
  });
export type NearbyQuery = z.infer<typeof nearbyInput>;
export function inRegion(region: Region, lat: number, lon: number) {
  return region === "goa"
    ? lat >= 14.8 && lat <= 15.9 && lon >= 73.6 && lon <= 74.5
    : lat >= 26.65 && lat <= 27.25 && lon >= 75.5 && lon <= 76.1;
}
export function referenceFor(q: NearbyQuery) {
  return q.referenceId === "custom"
    ? {
        id: "custom",
        region: q.region,
        name: "Your map point",
        kind: "area" as const,
        lat: q.customLat!,
        lon: q.customLon!,
      }
    : references.find((r) => r.id === q.referenceId && r.region === q.region)!;
}
export function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat),
    dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return (
    6371.0088 *
    2 *
    Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)))
  );
}
export type MappedHotel = {
  id: string;
  name: string;
  kind: string;
  lat: number;
  lon: number;
  distanceKm: number;
  address: string;
  website: string | null;
  phone: string | null;
  stars: string | null;
  sourceUrl: string;
  nightlyPrice: null;
};
export function mappedHotels(
  payload: unknown,
  origin: { lat: number; lon: number },
  radius: number,
): MappedHotel[] {
  const envelope = z
    .object({ elements: z.array(z.unknown()).max(10000) })
    .parse(payload);
  const element = z.object({
    type: z.enum(["node", "way", "relation"]),
    id: z.number().int(),
    lat: z.number().min(-90).max(90).optional(),
    lon: z.number().min(-180).max(180).optional(),
    center: z
      .object({
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
      })
      .optional(),
    tags: z.record(z.string(), z.string()),
  });
  const hotels: MappedHotel[] = [];
  for (const item of envelope.elements) {
    const p = element.safeParse(item);
    if (!p.success) continue;
    const e = p.data,
      t = e.tags;
    const position =
      e.lat !== undefined && e.lon !== undefined
        ? { lat: e.lat, lon: e.lon }
        : e.center;
    if (
      !position ||
      !["hotel", "motel", "guest_house", "hostel", "apartment"].includes(
        t.tourism,
      )
    )
      continue;
    const distance = distanceKm(origin, position);
    if (distance > radius) continue;
    hotels.push({
      id: `${e.type}/${e.id}`,
      name: t.name || t["name:en"] || "Unnamed accommodation",
      kind: t.tourism,
      ...position,
      distanceKm: distance,
      address:
        [
          t["addr:housenumber"],
          t["addr:street"],
          t["addr:suburb"],
          t["addr:city"],
          t["addr:postcode"],
        ]
          .filter(Boolean)
          .join(", ") || "Address not mapped",
      website: publicWebsite(t["contact:website"] || t.website),
      phone: t["contact:phone"] || t.phone || null,
      stars: /^[1-5]$/.test(t.stars || "") ? t.stars : null,
      sourceUrl: `https://www.openstreetmap.org/${e.type}/${e.id}`,
      nightlyPrice: null,
    });
  }
  return hotels.sort(
    (a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name),
  );
}
