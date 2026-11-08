"use client";
import { useEffect, useState, FormEvent } from "react";
import { money } from "@/lib/hotels";
type Visit = {
  id: string;
  hotelName: string;
  targetUrl: string;
  city: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: "pending" | "opened" | "confirmed";
  createdAt: string;
  lastOpenedAt: string | null;
  bookingId: string | null;
  bookedTotal: number | null;
  quotedTotal: number | null;
};
export default function HandoffsPanel({
  onConfirmed,
}: {
  onConfirmed: () => Promise<void>;
}) {
  const [visits, setVisits] = useState<Visit[]>([]),
    [pending, setPending] = useState(0),
    [selected, setSelected] = useState<Visit | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    checkIn: "",
    checkOut: "",
    guests: "2",
    roomDescription: "",
    mealPlan: "",
    originalTotal: "",
    cancellationFee: "0",
    cancellationBefore: "",
    confirmed: false,
  });
  async function load() {
    const r = await fetch("/api/handoffs", { cache: "no-store" });
    if (r.status === 401) {
      setVisits([]);
      return;
    }
    if (!r.ok)
      throw Error("Could not load saved visits. Check database migrations.");
    const data = await r.json();
    setVisits(data.visits);
    setPending(
      data.pendingCount ??
        data.visits.filter((v: Visit) => v.status !== "confirmed").length,
    );
  }
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "hidden")
        load().catch((e) => setError(e.message));
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  function choose(v: Visit) {
    setSelected(v);
    setError("");
    setNotice("");
    setForm({
      checkIn: v.checkIn.slice(0, 10),
      checkOut: v.checkOut.slice(0, 10),
      guests: String(v.guests),
      roomDescription: "",
      mealPlan: "",
      originalTotal: "",
      cancellationFee: "0",
      cancellationBefore: "",
      confirmed: false,
    });
  }
  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/handoffs/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmed: form.confirmed,
          booking: {
            hotelId: "custom",
            hotelName: selected.hotelName,
            checkIn: form.checkIn,
            checkOut: form.checkOut,
            guests: Number(form.guests),
            roomDescription: form.roomDescription,
            mealPlan: form.mealPlan,
            originalTotal: Number(form.originalTotal),
            cancellationFee: Number(form.cancellationFee),
            cancellationBefore: form.cancellationBefore
              ? new Date(form.cancellationBefore).toISOString()
              : null,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setSelected(null);
      setNotice(
        "Your reported booking and paid total were saved. You can now record or research later prices.",
      );
      await Promise.all([load(), onConfirmed()]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not confirm this booking.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function dismiss(id: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/handoffs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
      if (!r.ok) throw Error("Could not dismiss this visit.");
      if (selected?.id === id) setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update visit.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="handoffs-panel">
      <div className="section-heading">
        <div>
          <h3>
            Booking-site visits{" "}
            {pending > 0 && `· ${pending} awaiting your response`}
          </h3>
          <p>
            Opening another site does not tell us whether you bought a room.
            Confirm the actual booking and full amount paid.
          </p>
        </div>
        <a className="outline" href="/nearby">
          Find nearby hotels
        </a>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="form-notice" role="status">
          {notice}
        </p>
      )}
      {!visits.length ? (
        <p className="watch-note">
          Saved site visits will appear here after you open a hotel link through
          Cheap Travel.
        </p>
      ) : (
        <div className="visit-list">
          {visits.map((v) => (
            <article className="visit-card" key={v.id}>
              <h4>{v.hotelName}</h4>
              <p>
                {v.city} · {v.checkIn.slice(0, 10)} → {v.checkOut.slice(0, 10)}{" "}
                · {v.guests} guests
              </p>
              <p>{new URL(v.targetUrl).hostname}</p>
              {v.quotedTotal !== null && (
                <p className="watch-note">
                  Amount saved with the visit: {money(v.quotedTotal)}{" "}
                  (unverified; not the confirmed paid total).
                </p>
              )}
              {v.status === "confirmed" ? (
                <p className="form-notice">
                  You reported this booking
                  {v.bookedTotal !== null
                    ? ` at ${money(v.bookedTotal)}`
                    : ". The tracked record was removed."}
                  .
                </p>
              ) : (
                <>
                  <p className="watch-note">
                    {v.status === "opened"
                      ? "Site opened — purchase not confirmed"
                      : "Visit saved — site not opened yet"}
                    {v.lastOpenedAt &&
                      ` · Last opened ${new Date(v.lastOpenedAt).toLocaleString()}`}
                  </p>
                  <div className="visit-actions">
                    <a
                      className="outline"
                      href={`/outbound/${v.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open saved site ↗
                    </a>
                    <button
                      className="primary"
                      onClick={() => choose(v)}
                      disabled={busy}
                    >
                      I booked — add paid total
                    </button>
                    <button
                      className="outline"
                      onClick={() => dismiss(v.id)}
                      disabled={busy}
                    >
                      I didn’t book
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
      {selected && (
        <form className="booking-form confirm-booking-form" onSubmit={confirm}>
          <h3>What did you book at {selected.hotelName}?</h3>
          <div className="booking-dates">
            <label>
              Actual check-in
              <input
                required
                type="date"
                value={form.checkIn}
                onChange={(e) =>
                  setForm((v) => ({ ...v, checkIn: e.target.value }))
                }
              />
            </label>
            <label>
              Actual check-out
              <input
                required
                type="date"
                min={form.checkIn}
                value={form.checkOut}
                onChange={(e) =>
                  setForm((v) => ({ ...v, checkOut: e.target.value }))
                }
              />
            </label>
          </div>
          <label>
            Booked guests
            <input
              required
              type="number"
              min={1}
              max={12}
              value={form.guests}
              onChange={(e) =>
                setForm((v) => ({ ...v, guests: e.target.value }))
              }
            />
          </label>
          <label>
            Booked room type
            <input
              required
              minLength={2}
              maxLength={120}
              value={form.roomDescription}
              onChange={(e) =>
                setForm((v) => ({ ...v, roomDescription: e.target.value }))
              }
            />
          </label>
          <label>
            Booked meal plan
            <input
              required
              minLength={2}
              maxLength={80}
              placeholder="Room only / breakfast included"
              value={form.mealPlan}
              onChange={(e) =>
                setForm((v) => ({ ...v, mealPlan: e.target.value }))
              }
            />
          </label>
          <label>
            Full amount paid including taxes (INR)
            <input
              required
              type="number"
              min="0.01"
              max={100000000}
              step="0.01"
              value={form.originalTotal}
              onChange={(e) =>
                setForm((v) => ({ ...v, originalTotal: e.target.value }))
              }
            />
          </label>
          <label>
            Current cancellation fee (INR)
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={form.cancellationFee}
              onChange={(e) =>
                setForm((v) => ({ ...v, cancellationFee: e.target.value }))
              }
            />
          </label>
          <label>
            Cancellation deadline (local time)
            <input
              type="datetime-local"
              value={form.cancellationBefore}
              onChange={(e) =>
                setForm((v) => ({ ...v, cancellationBefore: e.target.value }))
              }
            />
          </label>
          <label className="confirmation-check">
            <input
              required
              type="checkbox"
              checked={form.confirmed}
              onChange={(e) =>
                setForm((v) => ({ ...v, confirmed: e.target.checked }))
              }
            />
            I completed this booking and entered the actual full-stay amount.
            This is my confirmation, not verification from the booking provider.
          </label>
          <button className="primary" disabled={busy}>
            Save confirmed booking
          </button>
          <button
            className="outline"
            type="button"
            onClick={() => setSelected(null)}
          >
            Cancel
          </button>
        </form>
      )}
    </section>
  );
}
