import { test } from "node:test";
import assert from "node:assert/strict";
import { savings, nightsBetween, hotels } from "../lib/hotels.ts";
test("net savings subtract the cancellation fee and never go negative", () => {
  assert.equal(savings(20000, 17000, 1000), 2000);
  assert.equal(savings(20000, 19000, 2000), 0);
  assert.equal(savings(20000, 22000, 0), 0);
});
test("invalid monetary inputs cannot produce a savings claim", () => {
  for (const value of [-1, NaN, Infinity])
    assert.throws(() => savings(value, 100, 0));
  assert.throws(() => savings(100, 100, -1));
});
test("stay duration handles valid dates and rejects invalid order", () => {
  assert.equal(nightsBetween("2027-01-01", "2027-01-04"), 3);
  assert.equal(nightsBetween("2027-01-04", "2027-01-01"), 0);
  assert.equal(nightsBetween("bad", "date"), 0);
  assert.equal(nightsBetween("2027-01-01", "2027-01-01"), 0);
});
test("demo offers being compared agree on meal and refund conditions", () => {
  for (const hotel of hotels) {
    assert.ok(hotel.offers.length >= 2);
    assert.equal(new Set(hotel.offers.map((o) => o.meals)).size, 1);
    assert.ok(hotel.offers.every((o) => o.refundable && o.total > 0));
  }
});
