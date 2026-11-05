import { test } from "node:test";
import assert from "node:assert/strict";
import { searchHotels } from "../lib/provider.ts";
test("hotel adapter uses requested dates and distinguishes test inventory from real prices", async () => {
  const originalFetch = globalThis.fetch;
  const previous = {
    id: process.env.AMADEUS_CLIENT_ID,
    secret: process.env.AMADEUS_CLIENT_SECRET,
    mode: process.env.AMADEUS_ENV,
  };
  process.env.AMADEUS_CLIENT_ID = "test-fixture";
  process.env.AMADEUS_CLIENT_SECRET = "test-fixture";
  process.env.AMADEUS_ENV = "test";
  const calls: string[] = [];
  globalThis.fetch = async (url, options) => {
    const path = String(url);
    calls.push(path);
    if (path.includes("oauth2/token")) {
      assert.equal(options?.method, "POST");
      return Response.json({ access_token: "fixture-token", expires_in: 3600 });
    }
    if (path.includes("hotels/by-city"))
      return Response.json({ data: [{ hotelId: "TEST0001" }] });
    assert.ok(path.includes("checkInDate=2027-01-02"));
    assert.ok(path.includes("checkOutDate=2027-01-05"));
    assert.ok(path.includes("adults=2"));
    return Response.json({
      data: [
        {
          hotel: { hotelId: "TEST0001", name: "Fixture Hotel" },
          offers: [
            {
              id: "fixture",
              checkInDate: "2027-01-02",
              checkOutDate: "2027-01-05",
              boardType: "BREAKFAST",
              room: {
                type: "STANDARD",
                typeEstimated: {
                  category: "STANDARD_ROOM",
                  beds: 1,
                  bedType: "KING",
                },
              },
              price: {
                total: "17000.50",
                currency: "INR",
                taxes: [{ included: true }],
              },
              policies: {},
            },
          ],
        },
      ],
    });
  };
  try {
    const quotes = await searchHotels({
      cityCode: "DEL",
      checkIn: "2027-01-02",
      checkOut: "2027-01-05",
      adults: 2,
      currency: "INR",
    });
    assert.equal(quotes.length, 1);
    assert.equal(quotes[0].total, 17000.5);
    assert.equal(quotes[0].mode, "test");
    assert.equal(quotes[0].chargesComplete, true);
    assert.ok(quotes[0].roomKey);
    assert.equal(calls.length, 3);
    assert.ok(
      calls.every((c) => c.startsWith("https://test.api.amadeus.com/")),
    );
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of [
      ["AMADEUS_CLIENT_ID", previous.id],
      ["AMADEUS_CLIENT_SECRET", previous.secret],
      ["AMADEUS_ENV", previous.mode],
    ]) {
      if (value === undefined) delete process.env[name!];
      else process.env[name!] = value;
    }
  }
});
