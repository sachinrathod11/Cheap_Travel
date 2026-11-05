# Cheap Travel

A hotel-first travel comparison and price-tracking MVP built with Next.js, React, and TypeScript. Compare sample offers, save hotels, track a stay, simulate a price drop, and ask a retrieval-backed policy assistant.

Provider hotel search, automatic price-check jobs and in-app candidate alerts are available at `/explore` and `/account` when configured. Follow [Provider, AI and monitoring setup](docs/PROVIDERS.md). Hotel and AI credentials are not bundled. The homepage remains an explicitly labelled sample comparison.

## Run

Requires Node.js 22.18+ (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

For accounts and saved booking history, copy `.env.example` to `.env.local`, then start PostgreSQL and initialize the schema:

```sh
docker compose up -d db
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

Without AI credentials, `/api/assistant` retrieves PostgreSQL travel guides and the signed-in user's booking records, with selected sample policies labelled demo. With `AI_API_KEY`, the model uses these sources for specific answers and can offer general travel guidance beyond the sample hotels. Retrieval uses full-text search, not embeddings or a vector database.

To enable model generation, copy `.env.example` to `.env.local` and set `AI_API_KEY` securely. `AI_MODEL` defaults to `gpt-4.1-mini`. The key stays server-side. Outbound HTTPS access to `api.openai.com` is required. The route supplies retrieved policies as context, asks the model to avoid unsupported claims, and falls back to the local response if the provider fails.

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
