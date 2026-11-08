# Cheap Travel

A hotel-first travel comparison and price-tracking MVP built with Next.js, React, and TypeScript. Compare sample offers, save hotels, track a stay, simulate a price drop, and ask a retrieval-backed policy assistant.

Goa and Jaipur have coordinate-based nearby-hotel discovery, airport/station/area reference points, radius filters and a saved external-site visit → customer-confirmed booking flow. See [Nearby hotels and booking handoffs](docs/LOCATIONS_AND_BOOKINGS.md) for setup, data coverage and what can be tracked. Map listings have no live room prices, and an outbound click never confirms a purchase.

The main search opens public booking-site research at `/web-search`, using AI web-search tools with clickable citations. It requires an AI key and a tool-capable model, not Amadeus credentials. Run `npm run ai:web-check` to verify access. Public results are unverified leads and cannot trigger rebooking alerts. Structured provider search, price-check jobs and in-app candidate alerts remain at `/explore` and `/account`. Follow [Provider, AI and monitoring setup](docs/PROVIDERS.md). Keys are not bundled; homepage price cards remain labelled samples.

## Run

Requires Node.js 22.18+ (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

For accounts and saved booking history, copy `.env.example` to `.env.local`, then start PostgreSQL and initialize the schema:

```sh
docker compose up -d --wait db
npm run db:init
```

Set `DATABASE_URL` to the local PostgreSQL URL shown in `.env.example`. Generate a private `AUTH_SECRET` with `openssl rand -base64 32`; keep both values in `.env.local`, never in source control. Registration requires a password of at least 12 characters. The app stores a seven-day, HTTP-only session cookie.

Run commands in the repository root. `npm run build` produces the production build; `npm start` starts it. `npm test` checks savings calculations, stay duration, and equivalent demo offer conditions.

## What works

- Destination search for Goa, Jaipur, and Udaipur; dates; sorting; budget and meal filters.
- Comparison of per-night and full-stay totals including illustrative taxes for two adults in one room.
- Hotel details with room policies and provider offers.
- Saved hotels and watchlist persistence in browser local storage.
- A deliberate 15% price-drop simulation with net savings after the user-entered cancellation fee.
- Account registration and sign-in, with salted password hashes and signed sessions.
- Private hotel booking records with room, dates, meal plan, cancellation terms, and manually recorded price history.
- A server-side policy assistant that retrieves relevant policy documents, exposes its sources, and optionally uses an LLM to generate a grounded answer.
- Responsive layouts for desktop and mobile.

## AI and retrieval

The assistant answers only Cheap Travel application questions: hotel comparison, tracked bookings, price checks and cancellation/rebooking costs. It retrieves application help, PostgreSQL policy guides and the signed-in user's booking records. General-purpose questions are redirected. Retrieval uses full-text search, not embeddings or a vector database.

To enable model generation, set `AI_API_KEY`, an explicit accessible `AI_MODEL` and `AI_REASONING_EFFORT=low` in `.env.local`. The model must support low reasoning effort and structured output; chat UI names are not assumed to be API IDs. Run `npm run ai:models` to list account-accessible IDs, then `npm run ai:check` to verify a real request using the app's settings. Keys stay server-side. Outbound HTTPS access to `api.openai.com` is required. See the provider guide for details; missing configuration or provider failure results in clearly labelled product-help fallback and a safe diagnostic code.

`GET /api/hotels?city=Goa` returns explicitly marked demo offers. `POST /api/assistant` accepts `{ "question": "What is Alila's cancellation policy?", "hotelId": "alila" }`.

## Scope and limitations

Homepage offers, policies, review scores, and savings examples are sample data. `/explore` uses Amadeus when configured and labels test/production inventory. Photos are illustrative Unsplash images, not verified photographs of the named hotels. Homepage provider names illustrate the comparison concept; there is no affiliation. Illustrative images are served locally; see `public/images/CREDITS.md` for sources. System fonts keep the app independent of external font services.

No reservation, payment, or cancellation is implemented. Booking tracking requires PostgreSQL. Manual checks work for entered hotel bookings; matching provider-linked bookings can be checked on arrival or by the separate monitoring worker. Candidate alerts appear in the account page; email notifications are not implemented. The original browser demo watchlist still uses local storage. Do not use sample policies to make real cancellation decisions.

The app runs as a Next.js server with PostgreSQL and an optional monitoring worker. A future Python service and vector retrieval can be added when their capabilities are needed; neither is required by the current implementation.

## Next implementation stages

1. Obtain approved hotel API/affiliate access and implement provider adapters with provenance and fetch timestamps.
2. Normalize hotel identity, room, occupancy, dates, currency, taxes, meal plan, and cancellation conditions before matching offers.
3. Store verified bookings in PostgreSQL with accounts, consent, and validated booking-document extraction.
4. Schedule provider-compliant polling; calculate savings deterministically, respecting cancellation deadlines and fees; send opted-in notifications.
5. Add document ingestion and versioning, embeddings in pgvector, metadata-filtered retrieval, and grounded-answer evaluations.
6. Before public deployment, add API rate limits, request/body limits, authentication, monitoring, and retention controls.

Never automatically cancel the original booking before a replacement is confirmed.
