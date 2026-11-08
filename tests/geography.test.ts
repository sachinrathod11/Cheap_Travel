import { test } from "node:test";
import assert from "node:assert/strict";
import {
  distanceKm,
  mappedHotels,
  nearbyInput,
  references,
} from "../lib/geography.ts";
import { publicWebsite } from "../lib/public-url.ts";
import { handoffInput, handoffConfirmation } from "../lib/handoff-input.ts";
import { nearbyAction } from "../lib/assistant.ts";
const origin = { lat: 15.3808, lon: 73.8314 };
test("radius filtering uses actual unrounded distance, not a model estimate", () => {
  const near = {
    type: "node",
    id: 1,
    lat: origin.lat + 0.01,
    lon: origin.lon,
    tags: { tourism: "hotel", name: "Near" },
  };
  const far = {
    ...near,
    id: 2,
    lat: origin.lat + 0.2,
    tags: { tourism: "hotel", name: "Far" },
  };
  const result = mappedHotels({ elements: [far, near] }, origin, 5);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, "Near");
  assert.ok(result[0].distanceKm < 5);
  assert.equal(result[0].nightlyPrice, null);
  const distance = distanceKm(origin, { lat: near.lat, lon: near.lon });
  assert.equal(
    mappedHotels({ elements: [near] }, origin, distance - 0.000001).length,
    0,
  );
  assert.equal(distanceKm(origin, origin), 0);
});
test("Goa and Jaipur reference selections cannot silently cross regions", () => {
  assert.ok(references.some((r) => r.region === "goa" && r.kind === "airport"));
  assert.ok(
    references.some((r) => r.region === "jaipur" && r.kind === "railway"),
  );
  assert.equal(
    nearbyInput.safeParse({ region: "jaipur", referenceId: "goi", radiusKm: 5 })
      .success,
    false,
  );
  assert.equal(
    nearbyInput.safeParse({
      region: "goa",
      referenceId: "custom",
      customLat: 26.9,
      customLon: 75.8,
      radiusKm: 5,
    }).success,
    false,
  );
  assert.equal(
    nearbyInput.safeParse({ region: "goa", referenceId: "goi", radiusKm: 0 })
      .success,
    false,
  );
});
test("only public HTTPS links without login/session data can become saved hotel handoffs", () => {
  assert.equal(
    publicWebsite("hotel.example/rooms"),
    "https://hotel.example/rooms",
  );
  for (const url of [
    "javascript:alert(1)",
    "http://hotel.example",
    "https://localhost",
    "https://127.0.0.1",
    "https://user:pass@hotel.example",
    "https://hotel.example?access_token=private",
    "https://hotel.example?sid=private",
  ])
    assert.equal(publicWebsite(url), null);
  const draft = {
    hotelName: "Hotel",
    targetUrl: "https://hotel.example",
    city: "Goa",
    checkIn: "2026-12-03",
    checkOut: "2026-12-05",
    guests: 2,
    consent: true,
  };
  assert.equal(handoffInput.safeParse(draft).success, true);
  assert.equal(
    handoffInput.safeParse({ ...draft, consent: false }).success,
    false,
  );
  assert.equal(
    handoffConfirmation.safeParse({ confirmed: false, booking: {} }).success,
    false,
  );
});
test("chat radius requests keep airport/station context instead of silently becoming generic searches", () => {
  const action = nearbyAction(
    "Goa",
    "Find hotels within 5 km of Mopa airport",
    { checkIn: "2026-12-03", checkOut: "2026-12-05", adults: 2 },
  );
  assert.ok(action);
  const url = new URL(action.href, "https://app.example");
  assert.equal(url.pathname, "/nearby");
  assert.equal(url.searchParams.get("radiusKm"), "5");
  assert.equal(url.searchParams.get("referenceId"), "gox");
  assert.equal(nearbyAction("London", "near an airport"), null);
});
