"use client";
import { useEffect, useState } from "react";
export default function PendingVisitsBanner() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    async function refresh() {
      if (document.visibilityState === "hidden") return;
      try {
        const r = await fetch("/api/handoffs", { cache: "no-store" });
        if (!r.ok) return;
        const data = await r.json();
        if (active) setCount(data.pendingCount || 0);
      } catch {}
    }
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return count > 0 ? (
    <aside className="return-booking-banner">
      Welcome back. You have {count} saved site visit{count === 1 ? "" : "s"}{" "}
      awaiting your response.{" "}
      <a href="/account">Tell us what you booked and paid →</a>
    </aside>
  ) : null;
}
