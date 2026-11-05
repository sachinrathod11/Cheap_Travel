"use client";
import { FormEvent, useEffect, useState } from "react";
import type { Quote } from "@/lib/provider";
import { localDate } from "@/lib/dates";
export default function Explore() {
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(localDate());
  }, []);
  const [city, setCity] = useState("GOI"),
    [checkIn, setIn] = useState(""),
    [checkOut, setOut] = useState(""),
    [adults, setAdults] = useState(2),
    [quotes, setQuotes] = useState<Quote[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [searched, setSearched] = useState(false),
    [selected, setSelected] = useState<Quote | null>(null),
    [total, setTotal] = useState(""),
    [fee, setFee] = useState("0"),
    [deadline, setDeadline] = useState(""),
    [notice, setNotice] = useState("");
  async function search(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    setSelected(null);
    setQuotes([]);
    try {
      const r = await fetch(
        `/api/search?${new URLSearchParams({ cityCode: city.toUpperCase(), checkIn, checkOut, adults: String(adults), currency: "INR" })}`,
      );
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setQuotes(data.quotes);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }
  async function track(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: selected.hotelId,
          hotelName: selected.hotelName,
          providerHotelId: selected.hotelId,
          roomKey: selected.roomKey,
          checkIn: selected.checkIn,
          checkOut: selected.checkOut,
          guests: selected.adults,
          roomDescription: selected.room.slice(0, 120),
          mealPlan: selected.mealPlan,
          originalTotal: Number(total),
          cancellationFee: Number(fee),
          cancellationBefore: deadline
            ? new Date(deadline).toISOString()
            : null,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setNotice("Booking saved. Review it and check prices in My bookings.");
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not track booking.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="live-search">
      <div className="section-heading">
        <div>
          <a href="/">← Cheap Travel</a>
          <h1>Find hotel offers.</h1>
          <p>
            Search Amadeus inventory for your dates. Sign in before tracking
            your booking.
          </p>
        </div>
        <a className="outline" href="/account">
          My bookings / Sign in
        </a>
      </div>
      <form className="booking-form live-search-form" onSubmit={search}>
        <label>
          City IATA code
          <input
            required
            pattern="[A-Za-z]{3}"
            maxLength={3}
            value={city}
            onChange={(e) => setCity(e.target.value.toUpperCase())}
          />
          <small>
            Examples: GOI (Goa), DEL (Delhi), BOM (Mumbai), JAI (Jaipur), PAR
            (Paris), LON (London)
          </small>
        </label>
        <label>
          Check-in
          <input
            required
            type="date"
            value={checkIn}
            min={today || undefined}
            onChange={(e) => setIn(e.target.value)}
          />
        </label>
        <label>
          Check-out
          <input
            required
            type="date"
            min={checkIn}
            value={checkOut}
            onChange={(e) => setOut(e.target.value)}
          />
        </label>
        <label>
          Adults
          <input
            required
            type="number"
            min={1}
            max={8}
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "Searching…" : "Search hotel offers"}
        </button>
      </form>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="form-notice">
          {notice}
        </p>
      )}
      {searched && !busy && !quotes.length && (
        <div className="empty">
          No available offers returned for these dates. Try a different city or
          dates.
        </div>
      )}
      {selected && (
        <form className="booking-form" onSubmit={track}>
          <h2>Track your reservation at {selected.hotelName}</h2>
          <p>
            Enter your actual booking total and cancellation terms. Saving here
            does not reserve a room. Test offers cannot trigger real savings
            alerts.
          </p>
          <label>
            Your booked total (INR)
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </label>
          <label>
            Cancellation fee (INR)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
          </label>
          <label>
            Cancellation deadline (your local timezone)
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>
          <label>
            <span>
              <input required type="checkbox" /> My original booking has the
              same room, dates, guests and meals as this offer.
            </span>
          </label>
          <button className="primary" disabled={busy}>
            Save tracked booking
          </button>
          <button
            type="button"
            className="outline"
            onClick={() => setSelected(null)}
          >
            Cancel
          </button>
        </form>
      )}
      <div className="watch-grid">
        {quotes.map((q) => (
          <article className="watch-card" key={q.id}>
            <span className="eyebrow">
              AMADEUS ·{" "}
              {q.mode === "test" ? "TEST INVENTORY" : "PRODUCTION INVENTORY"}
            </span>
            <h2>{q.hotelName}</h2>
            <p>
              {q.checkIn} → {q.checkOut} · {q.adults} adults · 1 room
            </p>
            <p>{q.room}</p>
            <p>{q.mealPlan}</p>
            <strong>
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: q.currency,
              }).format(q.total)}{" "}
              total quoted by provider
            </strong>
            <details>
              <summary>Provider policy details</summary>
              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {JSON.stringify(q.cancellation, null, 2)}
              </pre>
            </details>
            <small className="watch-note">
              Checked {new Date(q.fetchedAt).toLocaleString()}. Review extra
              taxes and property charges in provider policies. This is one
              provider, not a comparison of all booking sites.
            </small>
            <button
              className="outline full"
              disabled={!q.roomKey}
              onClick={() => {
                setSelected(q);
                setTotal(String(q.total));
                setNotice("");
              }}
            >
              {q.roomKey
                ? "Track my matching booking"
                : "Room details insufficient for automatic tracking"}
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
