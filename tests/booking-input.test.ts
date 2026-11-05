import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingInput, bookingValidationError } from "../lib/booking-input.ts";
const booking = {
  hotelId: "alila",
  hotelName: "",
  checkIn: "2026-12-03",
  checkOut: "2026-12-05",
  guests: 2,
  roomDescription: "Double room",
  mealPlan: "Breakfast included",
  originalTotal: 2800,
  cancellationFee: 0,
  cancellationBefore: null,
};
test("listed hotel accepts the blank hidden hotel name sent by older clients", () => {
  const result = bookingInput.safeParse(booking);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.hotelName, undefined);
  assert.equal(
    bookingInput.safeParse({ ...booking, hotelName: undefined }).success,
    true,
  );
});
test("custom hotels still require a name and return the relevant field", () => {
  const result = bookingInput.safeParse({
    ...booking,
    hotelId: "custom",
    hotelName: "   ",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    const error = bookingValidationError(result.error);
    assert.ok(error.error.startsWith("Hotel name:"));
    assert.ok(error.fields.hotelName);
  }
  assert.equal(
    bookingInput.safeParse({
      ...booking,
      hotelId: "custom",
      hotelName: "My Hotel",
    }).success,
    true,
  );
});
test("invalid dates, amounts and date order identify the bad field", () => {
  for (const [patch, field] of [
    [{ checkIn: "2026-02-30" }, "Check-in"],
    [{ checkOut: booking.checkIn }, "Check-out"],
    [{ originalTotal: 0 }, "Booked total"],
  ] as const) {
    const result = bookingInput.safeParse({ ...booking, ...patch });
    assert.equal(result.success, false);
    if (!result.success)
      assert.ok(
        bookingValidationError(result.error).error.startsWith(field + ":"),
      );
  }
});
