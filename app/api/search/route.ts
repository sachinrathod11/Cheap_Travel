import { searchHotels, searchInput, ProviderError } from "@/lib/provider";
export async function GET(request: Request) {
  const parsed = searchInput.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json(
      { error: "Enter a three-letter city code, future dates and 1–8 adults." },
      { status: 400 },
    );
  try {
    return Response.json({
      provider: "Amadeus",
      coverage:
        "One provider; prices may exclude charges collected at the hotel. Review provider policies before booking.",
      quotes: await searchHotels(parsed.data),
    });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ProviderError
            ? e.message
            : "Hotel search is temporarily unavailable.",
      },
      { status: e instanceof ProviderError ? e.status : 502 },
    );
  }
}
