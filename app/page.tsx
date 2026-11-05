"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  Heart,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingDown,
  X,
  Plane,
  BedDouble,
  Bus,
  CalendarDays,
  Users,
  Send,
  Menu,
  Waves,
  Coffee,
  Wifi,
  ArrowDown,
  Bookmark,
} from "lucide-react";
import { hotels, Hotel, money, savings, nightsBetween } from "@/lib/hotels";
type Watch = {
  id: string;
  hotelId: string;
  name: string;
  original: number;
  current: number;
  fee: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  simulated: boolean;
};
const initialDate = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
export default function Home() {
  const [tab, setTab] = useState("Discover");
  const [city, setCity] = useState("Goa");
  const [destination, setDestination] = useState("Goa");
  const [checkIn, setCheckIn] = useState(initialDate(14));
  const [checkOut, setCheckOut] = useState(initialDate(17));
  const [guests, setGuests] = useState(2);
  const [searched, setSearched] = useState({
    city: "Goa",
    checkIn: initialDate(14),
    checkOut: initialDate(17),
    guests: 2,
  });
  const [filter, setFilter] = useState("All stays");
  const [sort, setSort] = useState("Recommended");
  const [watches, setWatches] = useState<Watch[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selected, setSelected] = useState<Hotel | null>(null);
  const [toast, setToast] = useState("");
  const [chat, setChat] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<
    {
      role: string;
      text: string;
      sources?: { title: string; text: string }[];
    }[]
  >([
    {
      role: "assistant",
      text: "Hi, I’m your stay assistant. Ask me about demo hotel policies, cancellation windows, or how price tracking works.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      const w = JSON.parse(localStorage.getItem("ct-watches") || "[]");
      const f = JSON.parse(localStorage.getItem("ct-favorites") || "[]");
      if (Array.isArray(w))
        setWatches(
          w.filter(
            (v) =>
              hotels.some((h) => h.id === v.hotelId) &&
              typeof v.original === "number" &&
              typeof v.current === "number" &&
              typeof v.fee === "number",
          ),
        );
      if (Array.isArray(f))
        setFavorites(f.filter((v) => typeof v === "string"));
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) {
      localStorage.setItem("ct-watches", JSON.stringify(watches));
      localStorage.setItem("ct-favorites", JSON.stringify(favorites));
    }
  }, [watches, favorites, loaded]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(id);
  }, [toast]);
  const nights = nightsBetween(searched.checkIn, searched.checkOut) || 1;
  const list = hotels
    .filter(
      (h) =>
        h.city === searched.city &&
        (filter !== "Under ₹5,000" ||
          Math.min(...h.offers.map((o) => o.total)) < 5000) &&
        (filter !== "Breakfast included" ||
          h.amenities.includes("Breakfast")) &&
        (tab !== "Saved stays" || favorites.includes(h.id)),
    )
    .sort((a, b) =>
      sort === "Price: low to high"
        ? Math.min(...a.offers.map((o) => o.total)) -
          Math.min(...b.offers.map((o) => o.total))
        : sort === "Top rated"
          ? b.rating - a.rating
          : 0,
    );
  function search(e: React.FormEvent) {
    e.preventDefault();
    if (!nightsBetween(checkIn, checkOut)) {
      setToast("Check-out must be after check-in.");
      return;
    }
    setSearched({ city: destination, checkIn, checkOut, guests });
    setCity(destination);
    setTab("Discover");
  }
  function track(h: Hotel) {
    if (searched.guests !== 2) {
      setToast(
        "Demo rates support 2 guests. Search for 2 guests to track a stay.",
      );
      return;
    }
    const id = [
      h.id,
      searched.checkIn,
      searched.checkOut,
      searched.guests,
    ].join(":");
    if (watches.some((w) => w.id === id)) {
      setToast("This stay is already in your watchlist.");
      return;
    }
    const price = Math.min(...h.offers.map((o) => o.total)) * nights;
    setWatches((v) => [
      ...v,
      {
        id,
        hotelId: h.id,
        name: h.name,
        original: price,
        current: price,
        fee: 0,
        checkIn: searched.checkIn,
        checkOut: searched.checkOut,
        guests: searched.guests,
        simulated: false,
      },
    ]);
    setToast("Stay added. Explore a demo price drop in your watchlist.");
  }
  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || busy) return;
    const q = question;
    setQuestion("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, hotelId: selected?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.answer, sources: data.sources },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Could not get an answer. Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  const drops = watches.filter(
    (w) => savings(w.original, w.current, w.fee) > 0,
  );
  const totalSaving = drops.reduce(
    (sum, w) => sum + savings(w.original, w.current, w.fee),
    0,
  );
  return (
    <>
      <header>
        <a href="/" className="brand">
          <span className="brand-mark">
            <Plane size={21} />
          </span>
          cheap<span>travel</span>
          <i />
        </a>
        <nav>
          {["Discover", "My watchlist", "Saved stays"].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
              {t === "My watchlist" && watches.length > 0 && (
                <b>{watches.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="header-right">
          <span className="currency">INR · ₹</span>
          <button
            className="bell icon"
            aria-label="View price alerts"
            onClick={() => setTab("My watchlist")}
          >
            <Bell size={19} />
            {drops.length > 0 && <i />}
          </button>
          <button
            className="avatar"
            onClick={() =>
              setToast("Your demo stays are saved in this browser.")
            }
            aria-label="Local profile"
          >
            JD
          </button>
        </div>
      </header>
      <main>
        <div className="intro">
          <span className="eyebrow">
            <span /> LESS SPENDING. MORE GOING.
          </span>
          <span className="demo-tag">✧ Interactive demo · Sample prices</span>
        </div>
        <section className="hero">
          <div className="hero-copy">
            <h1>
              A great stay.
              <br />
              An even <em>better price.</em>
            </h1>
            <p>
              Compare hotel prices in one place. And if they drop
              <br className="desktop" /> after you book? We’ll help you spot the
              savings.
            </p>
            <div className="hero-proof">
              <span className="mini-avatars">
                <i>AK</i>
                <i>SR</i>
                <i>MP</i>
              </span>
              <span>
                <span className="stars">★★★★★</span>
                <br />
                <small>Built for the smarter way to travel</small>
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <img
              src="/images/escape.jpg"
              alt="Illustrative tropical island escape"
            />
            <div className="image-shade" />
            <span className="destination-stamp">
              <MapPin size={13} /> Somewhere you’d rather be.
            </span>
            <div className="floating-savings">
              <span className="saving-icon">
                <TrendingDown size={23} />
              </span>
              <div>
                <small>A little drop. A better trip.</small>
                <strong>
                  ₹2,400 <span>saved</span>
                </strong>
                <p>
                  Illustrative price-drop alert <span>✦</span>
                </p>
              </div>
              <span className="tiny-check">
                <Check size={13} />
              </span>
            </div>
            <span className="visual-caption">GOOD STAYS. GREAT FINDS.</span>
          </div>
        </section>
        <section className="search-panel">
          <div className="travel-tabs">
            <button className="chosen">
              <BedDouble size={17} /> Hotels <span>LET’S CHECK IN</span>
            </button>
            <button
              onClick={() =>
                setToast(
                  "Flights are coming later. Let’s find your next hotel first.",
                )
              }
            >
              <Plane size={17} /> Flights <small>Coming soon</small>
            </button>
            <button
              onClick={() =>
                setToast("Bus comparison is planned for a future release.")
              }
            >
              <Bus size={17} /> Buses <small>Coming soon</small>
            </button>
          </div>
          <form className="search-form" onSubmit={search}>
            <label className="destination-input">
              <MapPin size={21} />
              <span>
                <small>WHERE TO?</small>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  aria-label="Destination"
                >
                  <option>Goa</option>
                  <option>Jaipur</option>
                  <option>Udaipur</option>
                </select>
              </span>
            </label>
            <label>
              <CalendarDays size={19} />
              <span>
                <small>CHECK-IN</small>
                <input
                  aria-label="Check-in"
                  type="date"
                  value={checkIn}
                  min={initialDate(0)}
                  onChange={(e) => setCheckIn(e.target.value)}
                  required
                />
              </span>
            </label>
            <label>
              <CalendarDays size={19} />
              <span>
                <small>CHECK-OUT</small>
                <input
                  aria-label="Check-out"
                  type="date"
                  min={checkIn}
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  required
                />
              </span>
            </label>
            <label className="guest-input">
              <Users size={19} />
              <span>
                <small>GUESTS & ROOMS</small>
                <select
                  value={guests}
                  onChange={(e) => setGuests(+e.target.value)}
                  aria-label="Guests"
                >
                  <option value={2}>2 guests, 1 room</option>
                  <option value={1}>1 guest, 1 room</option>
                  <option value={3}>3 guests, 1 room</option>
                </select>
              </span>
            </label>
            <button className="primary search-button" type="submit">
              <Search size={18} /> Find my stay
            </button>
          </form>
          <div className="search-foot">
            <ShieldCheck size={13} /> One search. Transparent totals. No booking
            fees from us.
            <span>Demo rates are for 2 adults · Taxes included</span>
          </div>
        </section>
        <div className="trust-strip">
          <span>MORE CLARITY, EVERY STEP</span>
          <div>
            <Check size={15} /> Compare the same room
          </div>
          <div>
            <Check size={15} /> See the total, upfront
          </div>
          <div>
            <Check size={15} /> Keep an eye on price drops
          </div>
          <span className="powered">
            <Sparkles size={14} /> A little AI. A lot less guesswork.
          </span>
        </div>
        {tab === "My watchlist" ? (
          <section className="results">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  YOUR STAY, STILL GETTING SMARTER
                </span>
                <h2>
                  My price watchlist<span>.</span>
                </h2>
                <p>
                  Saved in this browser. Simulate a drop to see how a savings
                  alert works.
                </p>
              </div>
              <div className="saved-total">
                <TrendingDown size={20} />
                <strong>{money(totalSaving)}</strong>
                <small>potential demo savings</small>
              </div>
            </div>
            {!watches.length ? (
              <div className="empty">
                <Bookmark />
                <h3>Your next great find belongs here.</h3>
                <p>
                  Track a hotel from Discover to try a demo price-drop alert.
                </p>
                <button className="primary" onClick={() => setTab("Discover")}>
                  Explore stays <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="watch-grid">
                {watches.map((w) => (
                  <article className="watch-card" key={w.id}>
                    <div className="watch-top">
                      <span
                        className={w.simulated ? "price-alert" : "watch-label"}
                      >
                        {w.simulated ? (
                          <TrendingDown size={15} />
                        ) : (
                          <Bell size={15} />
                        )}{" "}
                        {w.simulated
                          ? "Demo price drop found"
                          : "Demo watch active"}
                      </span>
                      <button
                        className="icon"
                        aria-label={"Remove " + w.name}
                        onClick={() =>
                          setWatches((v) => v.filter((x) => x.id !== w.id))
                        }
                      >
                        <X size={17} />
                      </button>
                    </div>
                    <h3>{w.name}</h3>
                    <p>
                      {w.checkIn} → {w.checkOut} · {w.guests} guests
                    </p>
                    <div className="watch-prices">
                      <div>
                        <small>Original stay total</small>
                        <strong>{money(w.original)}</strong>
                      </div>
                      <ArrowRight size={18} />
                      <div>
                        <small>Current demo total</small>
                        <strong className="green">{money(w.current)}</strong>
                      </div>
                    </div>
                    <label className="fee-label">
                      Cancellation fee (₹)
                      <input
                        type="number"
                        min="0"
                        value={w.fee}
                        onChange={(e) =>
                          setWatches((v) =>
                            v.map((x) =>
                              x.id === w.id
                                ? {
                                    ...x,
                                    fee: Math.max(
                                      0,
                                      Number(e.target.value) || 0,
                                    ),
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <div className="net-saving">
                      Potential net saving{" "}
                      <strong>
                        {money(savings(w.original, w.current, w.fee))}
                      </strong>
                    </div>
                    <button
                      className="outline full"
                      onClick={() =>
                        setWatches((v) =>
                          v.map((x) =>
                            x.id === w.id
                              ? {
                                  ...x,
                                  current: Math.round(x.original * 0.85),
                                  simulated: true,
                                }
                              : x,
                          ),
                        )
                      }
                    >
                      {w.simulated
                        ? "Demo drop applied"
                        : "Simulate 15% price drop"}{" "}
                      <TrendingDown size={16} />
                    </button>
                    <small className="watch-note">
                      Illustrative equivalent offer. Check actual availability
                      and terms before rebooking. No reservation has been made.
                    </small>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="results">
            <div className="section-heading">
              <div>
                <span className="eyebrow">YOUR NEXT “GLAD WE FOUND THIS”</span>
                <h2>
                  {tab === "Saved stays"
                    ? "Your saved stays"
                    : `Good stays in ${city}`}
                  <span>.</span>
                </h2>
                <p>
                  {tab === "Saved stays"
                    ? "A little collection of places you love."
                    : `Handpicked vibes. Compared prices. A smarter place to start.`}
                </p>
              </div>
              <div className="results-meta">
                <span>
                  {list.length} stays · {nights} nights
                </span>
                <label>
                  <SlidersHorizontal size={15} />
                  <select
                    aria-label="Sort hotels"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option>Recommended</option>
                    <option>Price: low to high</option>
                    <option>Top rated</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="filter-row">
              {[
                "All stays",
                "Under ₹5,000",
                "Breakfast included",
                "Free cancellation",
              ].map((f) => (
                <button
                  key={f}
                  className={filter === f ? "selected" : ""}
                  onClick={() => setFilter(f)}
                >
                  {f === "All stays" && <Sparkles size={13} />} {f}
                </button>
              ))}
              <span>
                <span className="live-dot" /> Sample offers, no live
                availability
              </span>
            </div>
            {searched.guests !== 2 ? (
              <div className="empty">
                <Users />
                <h3>Demo offers are for two guests.</h3>
                <p>Choose 2 guests to explore comparable room prices.</p>
              </div>
            ) : list.length === 0 ? (
              <div className="empty">
                <Heart />
                <h3>No stays here yet.</h3>
                <p>
                  Try another destination or filter, or save a hotel with the
                  heart button.
                </p>
              </div>
            ) : (
              <div className="hotel-grid">
                {list.map((h) => {
                  const offers = [...h.offers].sort(
                    (a, b) => a.total - b.total,
                  );
                  const best = offers[0];
                  const diff = offers[offers.length - 1].total - best.total;
                  return (
                    <article className="hotel-card" key={h.id}>
                      <div
                        className="hotel-image"
                        style={{ background: h.color }}
                      >
                        <img
                          src={h.image}
                          alt={"Illustrative stay inspiration for " + h.name}
                        />
                        <span className="hotel-category">{h.category}</span>
                        <button
                          className={
                            "heart " +
                            (favorites.includes(h.id) ? "hearted" : "")
                          }
                          aria-label={
                            (favorites.includes(h.id) ? "Unsave " : "Save ") +
                            h.name
                          }
                          onClick={() =>
                            setFavorites((v) =>
                              v.includes(h.id)
                                ? v.filter((x) => x !== h.id)
                                : [...v, h.id],
                            )
                          }
                        >
                          <Heart
                            size={18}
                            fill={
                              favorites.includes(h.id) ? "currentColor" : "none"
                            }
                          />
                        </button>
                        <span className="image-count">
                          {offers.length} sites. One clear choice.
                        </span>
                      </div>
                      <div className="hotel-body">
                        <div className="rating-row">
                          <span>
                            <b>{h.rating}</b> Exceptional{" "}
                            <small>
                              ({h.reviews.toLocaleString()} reviews)
                            </small>
                          </span>
                          <span className="hotel-stars">★★★★★</span>
                        </div>
                        <h3>
                          <button onClick={() => setSelected(h)}>
                            {h.name}
                          </button>
                        </h3>
                        <p className="location">
                          <MapPin size={13} />
                          {h.location}
                        </p>
                        <div className="amenities">
                          {h.amenities.slice(0, 3).map((a, i) => (
                            <span key={a}>
                              {i === 0 ? (
                                <Waves size={12} />
                              ) : i === 1 ? (
                                <Wifi size={12} />
                              ) : (
                                <Coffee size={12} />
                              )}{" "}
                              {a}
                            </span>
                          ))}
                        </div>
                        <div className="offer-list">
                          {offers.map((o, i) => (
                            <div
                              key={o.provider}
                              className={i === 0 ? "best-offer" : ""}
                            >
                              <span>
                                <i
                                  className={"provider-dot p" + o.provider[0]}
                                />
                                {o.provider}
                                {i === 0 && <small>LOWEST</small>}
                              </span>
                              <strong>
                                {money(o.total)}
                                <small>/ night</small>
                              </strong>
                            </div>
                          ))}
                        </div>
                        <div className="price-summary">
                          <div>
                            <span className="saving-note">
                              <TrendingDown size={13} /> {money(diff)} less than
                              highest
                            </span>
                            <p>
                              <strong>{money(best.total * nights)}</strong>{" "}
                              <span>for {nights} nights, incl. taxes</span>
                            </p>
                          </div>
                          <button
                            className="view-deal"
                            aria-label={"Compare offers for " + h.name}
                            onClick={() => setSelected(h)}
                          >
                            <ArrowUpRight size={21} />
                          </button>
                        </div>
                        <button
                          className="track-button"
                          onClick={() => track(h)}
                        >
                          <Bell size={14} />
                          {watches.some(
                            (w) =>
                              w.id ===
                              [
                                h.id,
                                searched.checkIn,
                                searched.checkOut,
                                searched.guests,
                              ].join(":"),
                          )
                            ? "Tracking this stay"
                            : "Track price for this stay"}
                          <span>→</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
        <section className="reassurance">
          <div className="reassurance-symbol">
            <Bell size={28} />
            <span>
              <TrendingDown size={17} />
            </span>
          </div>
          <div>
            <span className="eyebrow">BOOKED DOESN’T HAVE TO MEAN DONE.</span>
            <h2>Prices change. Your plans can benefit.</h2>
            <p>
              Track your stay and spot a lower price before check-in.
              <br />
              We’ll help you understand the savings, with cancellation terms in
              mind.
            </p>
          </div>
          <button
            className="outline"
            onClick={() => {
              setChat(true);
              setQuestion("How does price tracking work?");
            }}
          >
            How price tracking works <ArrowRight size={16} />
          </button>
        </section>
        <section className="how">
          <div>
            <span>01</span>
            <h3>Find your kind of stay</h3>
            <p>
              Compare equivalent rooms and upfront totals across sample
              providers.
            </p>
          </div>
          <div>
            <span>02</span>
            <h3>Let your price stay in view</h3>
            <p>
              Save a stay to your watchlist and explore a simulated price drop.
            </p>
          </div>
          <div>
            <span>03</span>
            <h3>Make an informed next move</h3>
            <p>Review net savings and cancellation terms before you rebook.</p>
          </div>
        </section>
        <footer>
          <a className="brand" href="/">
            cheap<span>travel</span>
            <i />
          </a>
          <p>A little smarter. A little further.</p>
          <span>Demo project · No bookings or live monitoring</span>
          <button
            onClick={() => {
              setChat(true);
              setQuestion("How does price tracking work?");
            }}
          >
            Meet your stay assistant <Sparkles size={14} />
          </button>
        </footer>
      </main>
      <button className="assistant-fab" onClick={() => setChat((v) => !v)}>
        <Sparkles size={18} />
        <span>Ask your stay assistant</span>
        <span className="fab-dot" />
      </button>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section
            className="detail-modal"
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon"
              aria-label="Close hotel details"
              onClick={() => setSelected(null)}
            >
              <X />
            </button>
            <span className="eyebrow">COMPARE YOUR STAY · DEMO OFFERS</span>
            <h2>{selected.name}</h2>
            <p className="location">
              <MapPin size={14} />
              {selected.location}
            </p>
            <p>{selected.description}</p>
            <div className="policy">
              <ShieldCheck size={20} />
              <p>{selected.policy}</p>
            </div>
            <p className="detail-dates">
              {searched.checkIn} → {searched.checkOut} · {nights} nights · 2
              adults
            </p>
            {[...selected.offers]
              .sort((a, b) => a.total - b.total)
              .map((o) => (
                <div className="detail-offer" key={o.provider}>
                  <div>
                    <strong>{o.provider}</strong>
                    <small>{o.meals} · Refundable within policy window</small>
                  </div>
                  <strong>
                    {money(o.total * nights)}
                    <small>Total incl. taxes</small>
                  </strong>
                </div>
              ))}
            <p className="disclaimer">
              These are illustrative prices and policies, not live inventory or
              bookable offers. Provider names demonstrate comparison only; no
              affiliation is implied.
            </p>
            <div className="modal-actions">
              <button className="primary" onClick={() => track(selected)}>
                <Bell size={16} />
                Track this stay
              </button>
              <button
                className="outline"
                onClick={() => {
                  setChat(true);
                  setQuestion(
                    "Explain the cancellation policy for " + selected.name,
                  );
                }}
              >
                <Sparkles size={16} />
                Ask about the policy
              </button>
            </div>
          </section>
        </div>
      )}
      {chat && (
        <aside className="chat-panel" role="dialog" aria-label="Stay assistant">
          <div className="chat-heading">
            <span className="chat-symbol">
              <Sparkles size={20} />
            </span>
            <div>
              <strong>Your stay assistant</strong>
              <small>Answers grounded in demo hotel policies</small>
            </div>
            <button
              className="icon"
              aria-label="Close assistant"
              onClick={() => setChat(false)}
            >
              <X size={19} />
            </button>
          </div>
          <div className="chat-mode">
            DEMO KNOWLEDGE · AI ENABLED WHEN CONFIGURED
          </div>
          <div className="chat-messages" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={"message " + m.role}>
                <p>{m.text}</p>
                {m.sources && m.sources.length > 0 && (
                  <details>
                    <summary>
                      {m.sources.length} retrieved policy source
                      {m.sources.length > 1 ? "s" : ""}
                    </summary>
                    {m.sources.map((s) => (
                      <div key={s.title}>
                        <b>{s.title}</b>
                        <p>{s.text}</p>
                      </div>
                    ))}
                  </details>
                )}
              </div>
            ))}
            {busy && <p className="thinking">Checking the policy notes…</p>}
          </div>
          <form onSubmit={ask}>
            <input
              maxLength={2000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about a stay or policy…"
              aria-label="Message your stay assistant"
            />
            <button
              aria-label="Send question"
              disabled={busy || !question.trim()}
            >
              <Send size={18} />
            </button>
          </form>
          <small className="chat-disclaimer">
            Verify real booking terms with your provider.
          </small>
        </aside>
      )}
    </>
  );
}
