"use client";
import { FormEvent, useEffect, useState } from "react";
import { Hotel, money } from "@/lib/hotels";

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
  const [form, setForm] = useState({
    hotelId: hotels[0]?.id || "",
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
              maxLength={128}
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
            </select>
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
                        {new Date(b.checkIn).toLocaleDateString()} →{" "}
                        {new Date(b.checkOut).toLocaleDateString()} · {b.guests}{" "}
                        guests
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
                    Manual price checks only. Confirm room, dates, meals and
                    cancellation terms before rebooking.
                  </small>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
