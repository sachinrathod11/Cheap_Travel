"use client";
import { useEffect, useState, FormEvent } from "react";
import {
  references,
  type Region,
  type MappedHotel,
  type ReferencePoint,
} from "@/lib/geography";
import { localDate } from "@/lib/dates";
import HandoffButton from "@/app/handoff-button";
import PendingVisitsBanner from "@/app/pending-visits-banner";
type Result = {
  hotels: MappedHotel[];
  origin: ReferencePoint;
  radiusKm: number;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  fetchedAt: string;
  stale: boolean;
  coverage: string;
  distanceBasis: string;
  attribution: string;
  priceCoverage: string;
};
export default function NearbyPage() {
  const [form, setForm] = useState({
    region: "goa" as Region,
    referenceId: "goi",
    radiusKm: "10",
    customLat: "",
    customLon: "",
    kind: "all",
    minStars: "0",
    websiteOnly: false,
    checkIn: "",
    checkOut: "",
    adults: "2",
    budget: "",
  });
  const [today, setToday] = useState(""),
    [result, setResult] = useState<Result | null>(null),
    [searched, setSearched] = useState<typeof form | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setToday(localDate());
    const q = new URLSearchParams(window.location.search);
    const region = q.get("region") === "jaipur" ? "jaipur" : "goa";
    setForm((v) => ({
      ...v,
      region,
      referenceId: references.some(
        (r) => r.region === region && r.id === q.get("referenceId"),
      )
        ? q.get("referenceId")!
        : region === "goa"
          ? "goi"
          : "jai",
      radiusKm:
        Number(q.get("radiusKm")) >= 1 && Number(q.get("radiusKm")) <= 50
          ? q.get("radiusKm")!
          : "10",
      checkIn: /^\d{4}-\d{2}-\d{2}$/.test(q.get("checkIn") || "")
        ? q.get("checkIn")!
        : localDate(14),
      checkOut: /^\d{4}-\d{2}-\d{2}$/.test(q.get("checkOut") || "")
        ? q.get("checkOut")!
        : localDate(17),
      adults: /^[1-8]$/.test(q.get("adults") || "") ? q.get("adults")! : "2",
    }));
  }, []);
  async function search(page = 1, selection = form) {
    setError("");
    if (selection.checkOut <= selection.checkIn) {
      setError("Check-out must be after check-in.");
      return;
    }
    setBusy(true);
    try {
      const q = new URLSearchParams({
        region: selection.region,
        referenceId: selection.referenceId,
        radiusKm: selection.radiusKm,
        page: String(page),
        kind: selection.kind,
        minStars: selection.minStars,
        websiteOnly: String(selection.websiteOnly),
      });
      if (selection.referenceId === "custom") {
        q.set("customLat", selection.customLat);
        q.set("customLon", selection.customLon);
      }
      const response = await fetch("/api/nearby-hotels?" + q);
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setResult(data);
      setSearched({ ...selection });
    } catch (e) {
      setResult(null);
      setError(
        e instanceof Error ? e.message : "Could not load nearby hotels.",
      );
    } finally {
      setBusy(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    search();
  }
  return (
    <main className="live-search">
      <PendingVisitsBanner />
      <div className="section-heading">
        <div>
          <a href="/">← Cheap Travel</a>
          <h1>Find a stay near your arrival.</h1>
          <p>
            Goa and Jaipur · Airports, railway stations and chosen areas · A
            real map-distance boundary.
          </p>
        </div>
        <a className="outline" href="/account">
          My bookings & site visits
        </a>
      </div>
      <form className="booking-form nearby-form" onSubmit={submit}>
        <label>
          Region
          <select
            value={form.region}
            onChange={(e) => {
              const region = e.target.value as Region;
              setForm((v) => ({
                ...v,
                region,
                referenceId: region === "goa" ? "goi" : "jai",
              }));
            }}
          >
            <option value="goa">Goa</option>
            <option value="jaipur">Jaipur</option>
          </select>
        </label>
        <label>
          Distance from
          <select
            value={form.referenceId}
            onChange={(e) =>
              setForm((v) => ({ ...v, referenceId: e.target.value }))
            }
          >
            {(["airport", "railway", "area"] as const).map((kind) => (
              <optgroup
                key={kind}
                label={
                  kind === "airport"
                    ? "Airports"
                    : kind === "railway"
                      ? "Railway stations"
                      : "Areas"
                }
              >
                {references
                  .filter((r) => r.region === form.region && r.kind === kind)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </optgroup>
            ))}
            <option value="custom">Custom map coordinates</option>
          </select>
        </label>
        <label>
          Radius: {form.radiusKm} km
          <input
            type="range"
            min={1}
            max={50}
            step={0.5}
            value={form.radiusKm}
            onChange={(e) =>
              setForm((v) => ({ ...v, radiusKm: e.target.value }))
            }
          />
        </label>
        {form.referenceId === "custom" && (
          <>
            <label>
              Map latitude
              <input
                required
                type="number"
                step="any"
                min={-90}
                max={90}
                value={form.customLat}
                onChange={(e) =>
                  setForm((v) => ({ ...v, customLat: e.target.value }))
                }
              />
            </label>
            <label>
              Map longitude
              <input
                required
                type="number"
                step="any"
                min={-180}
                max={180}
                value={form.customLon}
                onChange={(e) =>
                  setForm((v) => ({ ...v, customLon: e.target.value }))
                }
              />
            </label>
          </>
        )}
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
            type="number"
            required
            min={1}
            max={8}
            value={form.adults}
            onChange={(e) => setForm((v) => ({ ...v, adults: e.target.value }))}
          />
        </label>
        <label>
          Budget target per night (INR)
          <input
            type="number"
            min={0}
            max={10000000}
            value={form.budget}
            onChange={(e) => setForm((v) => ({ ...v, budget: e.target.value }))}
          />
        </label>
        <label>
          Accommodation
          <select
            value={form.kind}
            onChange={(e) => setForm((v) => ({ ...v, kind: e.target.value }))}
          >
            <option value="all">All mapped stays</option>
            <option value="hotel">Hotels</option>
            <option value="guest_house">Guest houses</option>
            <option value="hostel">Hostels</option>
            <option value="apartment">Apartments</option>
            <option value="motel">Motels</option>
          </select>
        </label>
        <label>
          Mapped star category
          <select
            value={form.minStars}
            onChange={(e) =>
              setForm((v) => ({ ...v, minStars: e.target.value }))
            }
          >
            <option value="0">Any / unknown</option>
            {[2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+ stars
              </option>
            ))}
          </select>
        </label>
        <label className="confirmation-check">
          <input
            type="checkbox"
            checked={form.websiteOnly}
            onChange={(e) =>
              setForm((v) => ({ ...v, websiteOnly: e.target.checked }))
            }
          />
          Only stays with a listed HTTPS website
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "Finding mapped hotels…" : "Find nearby stays"}
        </button>
      </form>
      <p className="search-explanation">
        Radius is measured in a straight line from an approximate map reference
        point—not road distance or travel time. Map records have no dated room
        rates. Your budget goes into price research; properties shown here are
        not confirmed to fit it. OpenStreetMap coverage is not exhaustive.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {result && searched && (
        <section>
          <div className="section-heading">
            <div>
              <h2>
                {result.total} mapped stays within {result.radiusKm} km
              </h2>
              <p>
                {result.origin.name} · {searched.checkIn} → {searched.checkOut}{" "}
                · {searched.adults} adults
              </p>
              <a
                className="map-link"
                target="_blank"
                rel="noopener noreferrer"
                href={`https://www.openstreetmap.org/?mlat=${result.origin.lat}&mlon=${result.origin.lon}#map=13/${result.origin.lat}/${result.origin.lon}`}
              >
                See reference point on map ↗
              </a>
            </div>
            <span className="watch-note">
              {result.stale
                ? "Cached data — live refresh failed"
                : "Map data fetched"}{" "}
              {new Date(result.fetchedAt).toLocaleString()}
            </span>
          </div>
          {!result.hotels.length ? (
            <div className="empty">
              No mapped stays match these filters. Try a larger radius or remove
              the website/star filter.
            </div>
          ) : (
            <div className="nearby-grid">
              {result.hotels.map((h) => {
                const city = searched.region === "goa" ? "Goa" : "Jaipur";
                const q = new URLSearchParams({
                  destination: city,
                  hotelName: h.name,
                  checkIn: searched.checkIn,
                  checkOut: searched.checkOut,
                  adults: searched.adults,
                  budget: searched.budget || "0",
                  locationReference: result.origin.name,
                  radiusKm: String(result.radiusKm),
                });
                return (
                  <article className="nearby-card" key={h.id}>
                    <span className="eyebrow">
                      {h.distanceKm.toFixed(2)} KM FROM REFERENCE
                    </span>
                    <h3>{h.name}</h3>
                    <p>{h.address}</p>
                    <p>
                      {h.kind.replace("_", " ")}
                      {h.stars
                        ? ` · ${h.stars} stars as mapped`
                        : " · Star category unknown"}
                    </p>
                    {h.phone && <p>Listed phone: {h.phone}</p>}
                    <p className="watch-note">
                      Room price unavailable in map data.
                    </p>
                    <a className="outline full" href={`/web-search?${q}`}>
                      Research this hotel’s prices & booking links
                    </a>
                    <div className="map-card-links">
                      <a
                        href={h.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Map record ↗
                      </a>
                      {h.website && (
                        <span className="watch-note">
                          Listed website: {new URL(h.website).hostname}. Verify
                          hotel affiliation before paying.
                        </span>
                      )}
                    </div>
                    {h.website ? (
                      <HandoffButton
                        info={{
                          hotelName: h.name,
                          targetUrl: h.website,
                          city,
                          checkIn: searched.checkIn,
                          checkOut: searched.checkOut,
                          guests: Number(searched.adults),
                          catalogId: h.id,
                          referenceId: searched.referenceId,
                          radiusKm: result.radiusKm,
                        }}
                      />
                    ) : (
                      <small className="watch-note">
                        No hotel website is mapped. Use price research to find a
                        public booking page.
                      </small>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          <div className="catalog-pager">
            <button
              className="outline"
              disabled={busy || result.page <= 1}
              onClick={() => search(result.page - 1, searched)}
            >
              Previous
            </button>
            <span>
              Page {result.page} · {result.attribution} ·{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
              >
                Data licence
              </a>
            </span>
            <button
              className="outline"
              disabled={busy || !result.hasMore}
              onClick={() => search(result.page + 1, searched)}
            >
              Next
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
