"use client";
import { useState } from "react";
type Handoff = {
  hotelName: string;
  targetUrl: string;
  city: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  catalogId?: string;
  referenceId?: string;
  radiusKm?: number;
  quotedTotal?: number | null;
};
export default function HandoffButton({ info }: { info: Handoff }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [signIn, setSignIn] = useState(false);
  async function open() {
    setBusy(true);
    setError("");
    setSignIn(false);
    try {
      const response = await fetch("/api/handoffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...info, consent: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSignIn(response.status === 401);
        throw Error(data.error || "Could not save this visit.");
      }
      window.location.assign(data.openUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the site.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="handoff-action">
      <button className="primary" type="button" disabled={busy} onClick={open}>
        {busy ? "Saving visit…" : "Save visit & open site ↗"}
      </button>
      <small>
        We save this hotel, stay and link visit. Confirm what you actually
        booked when you return.
      </small>
      {error && (
        <p className="form-error" role="alert">
          {error} {signIn && <a href="/account">Sign in</a>}
        </p>
      )}
    </div>
  );
}
