"use client";
import { useEffect, useState, FormEvent } from "react";
import type { WebResult } from "@/lib/web-search";
import { localDate } from "@/lib/dates";
import CitedAnswer from "@/app/cited-web-answer";
import HandoffButton from "@/app/handoff-button";
import { publicWebsite } from "@/lib/public-url";
import PendingVisitsBanner from "@/app/pending-visits-banner";
export default function WebSearchPage() {
  const [form, setForm] = useState({
    destination: "",
    checkIn: "",
    checkOut: "",
    adults: "2",
    hotelName: "",
    budget: "",
    locationReference: "",
    radiusKm: "",
  });
  const [today, setToday] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [code, setCode] = useState(""),
    [result, setResult] = useState<WebResult | null>(null),
    [searched, setSearched] = useState<typeof form | null>(null);
  useEffect(() => {
    setToday(localDate());
    const q = new URLSearchParams(window.location.search);
    setForm((v) => ({
      ...v,
      destination: q.get("destination")?.slice(0, 200) || "",
      checkIn: /^\d{4}-\d{2}-\d{2}$/.test(q.get("checkIn") || "")
        ? q.get("checkIn")!
        : "",
      checkOut: /^\d{4}-\d{2}-\d{2}$/.test(q.get("checkOut") || "")
        ? q.get("checkOut")!
        : "",
      adults: /^[1-8]$/.test(q.get("adults") || "") ? q.get("adults")! : "2",
      hotelName: q.get("hotelName")?.slice(0, 200) || "",
      budget: q.get("budget")?.slice(0, 10) || "",
      locationReference: q.get("locationReference")?.slice(0, 200) || "",
      radiusKm: q.get("radiusKm") || "",
    }));
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setCode("");
    setResult(null);
    setSearched(null);
    try {
      const r = await fetch("/api/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          adults: Number(form.adults),
          budget: Number(form.budget) || 0,
          locationReference: form.locationReference || undefined,
          radiusKm: form.radiusKm ? Number(form.radiusKm) : undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setCode(data.code || "");
        throw Error(data.error || "Search failed.");
      }
      setResult(data);
      setSearched({ ...form });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not complete web search.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="live-search">
      <PendingVisitsBanner />
      <div className="section-heading">
        <div>
          <a href="/">← Cheap Travel</a>
          <h1>Search public hotel pages.</h1>
          <p>
            Find booking-site and direct-hotel pages for your stay, with sources
            you can open.
          </p>
        </div>
        <a className="outline" href="/account">
          Sign in / My bookings
        </a>
      </div>
      {form.locationReference && (
        <p className="search-explanation">
          Research for the selected hotel near {form.locationReference}, with a{" "}
          {form.radiusKm} km location preference. The map locator applies the
          distance boundary; public pages still need identity and rate
          verification.
        </p>
      )}
      <form className="booking-form public-search-form" onSubmit={submit}>
        <label>
          Destination
          <input
            required
            maxLength={200}
            minLength={2}
            value={form.destination}
            placeholder="Goa, India"
            onChange={(e) =>
              setForm((v) => ({ ...v, destination: e.target.value }))
            }
          />
        </label>
        <label>
          Check-in
          <input
            required
            type="date"
            min={today || undefined}
            value={form.checkIn}
            onChange={(e) =>
              setForm((v) => ({ ...v, checkIn: e.target.value }))
            }
          />
        </label>
        <label>
          Check-out
          <input
            required
            type="date"
            min={form.checkIn || today || undefined}
            value={form.checkOut}
            onChange={(e) =>
              setForm((v) => ({ ...v, checkOut: e.target.value }))
            }
          />
        </label>
        <label>
          Adults
          <input
            required
            type="number"
            min={1}
            max={8}
            value={form.adults}
            onChange={(e) => setForm((v) => ({ ...v, adults: e.target.value }))}
          />
        </label>
        <label>
          Hotel name (optional)
          <input
            maxLength={200}
            value={form.hotelName}
            placeholder="Your booked hotel"
            onChange={(e) =>
              setForm((v) => ({ ...v, hotelName: e.target.value }))
            }
          />
        </label>
        <label>
          Budget per night in INR (optional)
          <input
            type="number"
            min={0}
            max={10000000}
            value={form.budget}
            onChange={(e) => setForm((v) => ({ ...v, budget: e.target.value }))}
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "Searching public pages…" : "Search booking sites"}
        </button>
      </form>
      <p className="search-explanation">
        Sign-in required. This search uses AI web-search tools and may incur API
        charges. Public page results can be incomplete; final date-specific
        availability and totals must be checked with the provider. For
        structured provider quotes, <a href="/explore">search Amadeus</a>.
      </p>
      {busy && (
        <p role="status">
          Looking for public hotel pages and cited information. This may take up
          to 90 seconds.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
          {code && ` [${code}]`}
        </p>
      )}
      {result && (
        <section className="web-results">
          <span className="eyebrow">
            PUBLIC WEB RESULTS · VERIFY AT PROVIDER
          </span>
          <h2>
            {searched?.destination} · {searched?.checkIn} → {searched?.checkOut}{" "}
            · {searched?.adults} adults
          </h2>
          <p className="watch-note">
            Search completed {new Date(result.searchedAt).toLocaleString()}.
            This timestamp records the search, not the freshness of every source
            page.
          </p>
          <CitedAnswer result={result} />
          <h3>Sources used</h3>
          <ul>
            {result.sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  {s.title || new URL(s.url).hostname}
                </a>
                <small>{new URL(s.url).hostname}</small>
                {searched?.hotelName && publicWebsite(s.url) && (
                  <HandoffButton
                    info={{
                      hotelName: searched.hotelName,
                      targetUrl: s.url,
                      city: searched.destination,
                      checkIn: searched.checkIn,
                      checkOut: searched.checkOut,
                      guests: Number(searched.adults),
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
          <p className="web-verification">
            These are research leads, not verified comparable room prices. They
            do not trigger price-drop alerts. Confirm room, dates, guests,
            meals, taxes and cancellation terms before comparing rebooking
            costs.
          </p>
          <a href="/account" className="outline">
            Track your existing booking
          </a>
        </section>
      )}
    </main>
  );
}
