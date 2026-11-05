import { test } from "node:test";
import assert from "node:assert/strict";
import { candidateSaving } from "../lib/matching.ts";
import { roomKey, searchInput } from "../lib/provider.ts";
const booking = {
  roomKey: "same-room",
  currency: "INR",
  originalTotal: 20000,
  cancellationFee: 1000,
  cancellationBefore: new Date("2027-01-01"),
};
const quote = {
  id: "offer",
  hotelId: "hotel",
  hotelName: "Hotel",
  room: "Double",
  roomKey: "same-room",
  mealPlan: "BREAKFAST",
  total: 17000,
  currency: "INR",
  checkIn: "2027-02-01",
  checkOut: "2027-02-03",
  adults: 2,
  cancellation: null,
  chargesComplete: true,
  fetchedAt: "2026-11-05",
  mode: "production" as const,
};
const now = new Date("2026-11-05");
test("a candidate requires replacement plus cancellation fee to be lower", () => {
  assert.equal(candidateSaving(booking, quote, now), 2000);
  assert.equal(candidateSaving(booking, { ...quote, total: 19000 }, now), 0);
  assert.equal(
    candidateSaving({ ...booking, cancellationFee: 4000 }, quote, now),
    0,
  );
});
test("test prices, different rooms, currencies and incomplete charges cannot generate a savings alert", () => {
  assert.equal(candidateSaving(booking, { ...quote, mode: "test" }, now), 0);
  assert.equal(
    candidateSaving(booking, { ...quote, roomKey: "other" }, now),
    0,
  );
  assert.equal(candidateSaving(booking, { ...quote, currency: "USD" }, now), 0);
  assert.equal(
    candidateSaving(booking, { ...quote, chargesComplete: false }, now),
    0,
  );
});
test("expired or unknown cancellation deadlines cannot generate automatic savings", () => {
  assert.equal(
    candidateSaving({ ...booking, cancellationBefore: null }, quote, now),
    0,
  );
  assert.equal(
    candidateSaving({ ...booking, cancellationBefore: now }, quote, now),
    0,
  );
});
test("insufficient room detail does not create an equivalence key", () => {
  assert.equal(roomKey({ type: "STANDARD" }, "BREAKFAST"), "");
  assert.ok(
    roomKey(
      {
        type: "STANDARD",
        typeEstimated: { category: "STANDARD_ROOM", beds: 1, bedType: "KING" },
      },
      "BREAKFAST",
    ),
  );
});
test("search rejects invalid date order and guest counts", () => {
  assert.equal(
    searchInput.safeParse({
      cityCode: "DEL",
      checkIn: "2027-01-02",
      checkOut: "2027-01-01",
      adults: 2,
    }).success,
    false,
  );
  assert.equal(
    searchInput.safeParse({
      cityCode: "DEL",
      checkIn: "2027-01-02",
      checkOut: "2027-01-03",
      adults: 0,
    }).success,
    false,
  );
});
