import { hotels } from "@/lib/hotels";
export async function GET(request: Request) {
  const city = new URL(request.url).searchParams.get("city");
  return Response.json({
    mode: "demo",
    currency: "INR",
    hotels: hotels.filter(
      (h) => !city || h.city.toLowerCase() === city.toLowerCase(),
    ),
  });
}
