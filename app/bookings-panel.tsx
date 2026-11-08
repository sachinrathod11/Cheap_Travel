"use client";
import { FormEvent, useEffect, useState } from "react";
import { Hotel, money } from "@/lib/hotels";
import HandoffsPanel from "@/app/handoffs-panel";

type User = { id: string; email: string };
type Booking = {
  id: string;
  hotelId: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  roomDescription: string;
  mealPlan: string;
  originalTotal: number;
  cancellationFee: number;
  cancellationBefore: string | null;
  monitoringEnabled?: boolean;
  lastCheckedAt?: string | null;
  checkError?: string | null;
  city?: string | null;
  sourceUrl?: string | null;
  snapshots: {
    id: string;
    total: number;
    provider: string;
    capturedAt: string;
  }[];
};
export default function BookingsPanel({ hotels }: { hotels: Hotel[] }) {
  const [user, setUser] = useState<User | null>(null),
    [bookings, setBookings] = useState<Booking[]>([]),
    [mode, setMode] = useState<"login" | "register">("login"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [alerts, setAlerts] = useState<
    {
      id: string;
      hotelName: string;
      total: number;
      savings: number;
      createdAt: string;
    }[]
  >([]);
  const [form, setForm] = useState({
    hotelId: hotels[0]?.id || "",
    hotelName: "",
    checkIn: "",
    checkOut: "",
    guests: "2",
    roomDescription: "Double room",
    mealPlan: "Breakfast included",
    originalTotal: "",
    cancellationFee: "0",
    cancellationBefore: "",
  });
  async function load() {
    const session = await fetch("/api/auth/session").then((r) => r.json());
    setUser(session.user);
    if (session.user)
      setBookings(
        (await fetch("/api/bookings").then((r) => r.json())).bookings || [],
      );
    if (session.user)
      setAlerts(
        (await fetch("/api/alerts").then((r) => r.json())).alerts || [],
      );
    if (session.user) {
      // Refresh eligible monitored stays on arrival, with server-side throttling.
      const checked = await fetch("/api/monitor", { method: "POST" });
      if (checked.ok) {
        setBookings(
          (await fetch("/api/bookings").then((r) => r.json())).bookings || [],
        );
        setAlerts(
          (await fetch("/api/alerts").then((r) => r.json())).alerts || [],
        );
      }
    }
  }
  useEffect(() => {
    load().catch(() => setError("Could not connect to the account service."));
  }, []);
  async function submitAuth(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        `/api/auth/${mode === "login" ? "login" : "register"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setUser(data.user);
      setPassword("");
      setBookings(
        (await fetch("/api/bookings").then((v) => v.json())).bookings || [],
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }
  async function createBooking(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const payload = {
        ...form,
        hotelName:
          form.hotelId === "custom" ? form.hotelName.trim() : undefined,
        guests: Number(form.guests),
        originalTotal: Number(form.originalTotal),
        cancellationFee: Number(form.cancellationFee),
        cancellationBefore: form.cancellationBefore
          ? new Date(form.cancellationBefore).toISOString()
          : null,
      };
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setBookings((v) => [...v, data.booking]);
      setNotice("Booking saved. Its first price snapshot is ready.");
      setForm((v) => ({ ...v, originalTotal: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save booking.");
    } finally {
      setBusy(false);
    }
  }
  async function snapshot(booking: Booking) {
    const value = window.prompt(
      "Enter the latest equivalent total price in INR:",
    );
    if (!value) return;
    const r = await fetch(`/api/bookings/${booking.id}/prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total: Number(value), provider: "Manual check" }),
    });
    const data = await r.json();
    if (!r.ok) {
      setError(data.error);
      return;
    }
    setBookings((v) =>
      v.map((b) =>
        b.id === booking.id
          ? { ...b, snapshots: [data.snapshot, ...b.snapshots] }
          : b,
      ),
    );
    setNotice("Price check saved.");
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setBookings([]);
    setAlerts([]);
  }
  async function checkPrices() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/monitor", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      await load();
      setNotice(
        data.busy
          ? "A price check is already running."
          : `${data.checked} bookings checked, ${data.alerts} new candidate alerts, ${data.failed} failed. Checks are limited to once per 30 minutes.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check prices.");
    } finally {
      setBusy(false);
    }
  }
  async function removeBooking(id: string) {
    if (!window.confirm("Remove this tracked booking and its price history?"))
      return;
    const r = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    if (!r.ok) {
      setError("Could not remove this booking.");
      return;
    }
    await load();
  }
  if (!user)
    return (
      <section className="account-panel">
        <div className="account-copy">
          <span className="eyebrow">YOUR TRIPS, ALL TOGETHER</span>
          <h2>
            Sign in to track a booking<span>.</span>
          </h2>
          <p>
            Create an account to keep booking details and price history across
            visits.
          </p>
        </div>
        <form className="account-form" onSubmit={submitAuth}>
          <div className="auth-switch">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
            >
              Create account
            </button>
          </div>
          <label>
            Email
            <input
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={mode === "register" ? 12 : 1}
              maxLength={72}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === "register" && <small>Use at least 12 characters.</small>}
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </section>
    );
  return (
    <section className="results">
      <div className="section-heading account-heading">
        <div>
          <span className="eyebrow">
            SIGNED IN AS {user.email.toUpperCase()}
          </span>
          <h2>
            Your tracked bookings<span>.</span>
          </h2>
          <p>
            Save a completed booking, then record equivalent prices as you check
            providers.
          </p>
        </div>
        <button className="outline" onClick={logout}>
          Sign out
        </button>
      </div>
      <div className="monitor-controls">
        <a className="primary" href="/explore">
          Search provider offers
        </a>
        <button className="outline" disabled={busy} onClick={checkPrices}>
          {busy ? "Checking…" : "Check monitored prices now"}
        </button>
        <p>
          Automatic checks apply to matching bookings linked through hotel
          search. Manually added hotels support manual checks.
        </p>
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
      {alerts.length > 0 && (
        <section className="alert-list">
          <h3>Candidate price-drop alerts</h3>
          {alerts.map((a) => (
            <article key={a.id}>
              <strong>
                {a.hotelName}: {money(a.savings)} potential saving
              </strong>
              <p>
                Provider quote {money(a.total)} ·{" "}
                {new Date(a.createdAt).toLocaleString()}. Check taxes,
                cancellation terms and availability before rebooking.
              </p>
            </article>
          ))}
        </section>
      )}
      <HandoffsPanel onConfirmed={load} />
      <div className="booking-layout">
        <form className="booking-form" onSubmit={createBooking}>
          <h3>Track a hotel booking</h3>
          <p>
            Enter your current reservation. Prices are stored privately in your
            account.
          </p>
          <label>
            Hotel
            <select
              required
              value={form.hotelId}
              onChange={(e) =>
                setForm((v) => ({ ...v, hotelId: e.target.value }))
              }
            >
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
              <option value="custom">Another hotel</option>
            </select>
          </label>
          {form.hotelId === "custom" && (
            <label>
              Hotel name
              <input
                required
                maxLength={200}
                value={form.hotelName}
                onChange={(e) =>
                  setForm((v) => ({ ...v, hotelName: e.target.value }))
                }
              />
            </label>
          )}
          <label>
            Guests
            <input
              type="number"
              required
              min={1}
              max={12}
              value={form.guests}
              onChange={(e) =>
                setForm((v) => ({ ...v, guests: e.target.value }))
              }
            />
          </label>
          <div className="booking-dates">
            <label>
              Check-in
              <input
                type="date"
                required
                value={form.checkIn}
                onChange={(e) =>
                  setForm((v) => ({ ...v, checkIn: e.target.value }))
                }
              />
            </label>
            <label>
              Check-out
              <input
                type="date"
                required
                min={form.checkIn}
                value={form.checkOut}
                onChange={(e) =>
                  setForm((v) => ({ ...v, checkOut: e.target.value }))
                }
              />
            </label>
          </div>
          <label>
            Room type
            <input
              required
              maxLength={120}
              value={form.roomDescription}
              onChange={(e) =>
                setForm((v) => ({ ...v, roomDescription: e.target.value }))
              }
            />
          </label>
          <label>
            Meal plan
            <input
              required
              maxLength={80}
              value={form.mealPlan}
              onChange={(e) =>
                setForm((v) => ({ ...v, mealPlan: e.target.value }))
              }
            />
          </label>
          <label>
            Booked total (₹)
            <input
              type="number"
              min="1"
              step="0.01"
              required
              value={form.originalTotal}
              onChange={(e) =>
                setForm((v) => ({ ...v, originalTotal: e.target.value }))
              }
            />
          </label>
          <label>
            Cancellation fee (₹)
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.cancellationFee}
              onChange={(e) =>
                setForm((v) => ({ ...v, cancellationFee: e.target.value }))
              }
            />
          </label>
          <label>
            Free cancellation deadline
            <input
              type="datetime-local"
              value={form.cancellationBefore}
              onChange={(e) =>
                setForm((v) => ({ ...v, cancellationBefore: e.target.value }))
              }
            />
          </label>
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
          <button className="primary" disabled={busy}>
            Save booking
          </button>
        </form>
        <div className="booking-list">
          {!bookings.length ? (
            <div className="empty">
              <h3>No tracked bookings yet.</h3>
              <p>Add your current booking to start a price history.</p>
            </div>
          ) : (
            bookings.map((b) => {
              const current = b.snapshots[0]?.total ?? b.originalTotal;
              const net = Math.max(
                0,
                b.originalTotal - current - b.cancellationFee,
              );
              return (
                <article className="booking-card" key={b.id}>
                  <div className="booking-title">
                    <div>
                      <h3>{b.hotelName}</h3>
                      <p>
                        {new Date(b.checkIn).toLocaleDateString(undefined, {
                          timeZone: "UTC",
                        })}{" "}
                        →{" "}
                        {new Date(b.checkOut).toLocaleDateString(undefined, {
                          timeZone: "UTC",
                        })}{" "}
                        · {b.guests} guests
                      </p>
                    </div>
                    <button className="outline" onClick={() => snapshot(b)}>
                      Record a price check
                    </button>
                  </div>
                  <div className="watch-prices">
                    <div>
                      <small>Booked total</small>
                      <strong>{money(b.originalTotal)}</strong>
                    </div>
                    <span>→</span>
                    <div>
                      <small>Latest checked total</small>
                      <strong className="green">{money(current)}</strong>
                    </div>
                  </div>
                  <div className="net-saving">
                    Potential saving after cancellation fee{" "}
                    <strong>{money(net)}</strong>
                  </div>
                  <details>
                    <summary>
                      Price history ({b.snapshots.length} checks)
                    </summary>
                    {b.snapshots.map((s) => (
                      <p key={s.id}>
                        {new Date(s.capturedAt).toLocaleString()} · {s.provider}{" "}
                        · {money(s.total)}
                      </p>
                    ))}
                  </details>
                  <small className="watch-note">
                    {b.monitoringEnabled
                      ? "Provider monitoring enabled."
                      : "Manual checks enabled."}{" "}
                    {b.lastCheckedAt &&
                      `Last provider check: ${new Date(b.lastCheckedAt).toLocaleString()}.`}{" "}
                    {b.checkError} Confirm room, dates, meals and cancellation
                    terms before rebooking.
                  </small>
                  {b.sourceUrl && (
                    <p className="watch-note">
                      Booking details reported by you after an external site
                      visit; not verified by that provider.
                    </p>
                  )}
                  <a
                    className="outline"
                    href={`/web-search?${new URLSearchParams({ destination: b.city || b.hotelName, hotelName: b.hotelName, checkIn: b.checkIn.slice(0, 10), checkOut: b.checkOut.slice(0, 10), adults: String(b.guests) })}`}
                  >
                    Research this same stay again
                  </a>
                  <button
                    className="outline"
                    onClick={() => removeBooking(b.id)}
                  >
                    Remove tracked booking
                  </button>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
