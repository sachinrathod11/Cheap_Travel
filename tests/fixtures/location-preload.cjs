require("./openai-web-preload.cjs");
const original = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (!url.startsWith("https://overpass-api.de/api/interpreter"))
    return original(input, init);
  const request = new Request(input, init);
  const q = new URLSearchParams(await request.text()).get("data") || "";
  const match = q.match(/around:([\d.]+),([\d.-]+),([\d.-]+)/);
  if (!match) throw Error("Invalid fixture map query");
  const lat = Number(match[2]),
    lon = Number(match[3]);
  return Response.json({
    elements: [
      {
        type: "node",
        id: 101,
        lat: lat + 0.002,
        lon,
        tags: {
          tourism: "hotel",
          name: "Near Airport Fixture Hotel",
          stars: "4",
          website: "https://hotel.example/rooms",
          "addr:city": "Fixture area",
        },
      },
      {
        type: "way",
        id: 102,
        center: { lat: lat + 0.003, lon },
        tags: {
          tourism: "guest_house",
          name: "Nearby Fixture Guest House",
          stars: "3",
        },
      },
      {
        type: "node",
        id: 103,
        lat: lat + 1,
        lon,
        tags: { tourism: "hotel", name: "Outside Radius Fixture Hotel" },
      },
    ],
  });
};
