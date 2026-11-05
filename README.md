# Cheap Travel

A hotel-first travel comparison and price-tracking MVP built with Next.js, React, and TypeScript. Compare sample offers, save hotels, track a stay, simulate a price drop, and ask a retrieval-backed policy assistant.

## Run

Requires Node.js 22.18+ (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

Run commands in the repository root. `npm run build` produces the production build; `npm start` starts it. `npm test` checks savings calculations, stay duration, and equivalent demo offer conditions.

## What works

- Destination search for Goa, Jaipur, and Udaipur; dates; sorting; budget and meal filters.
- Comparison of per-night and full-stay totals including illustrative taxes for two adults in one room.
- Hotel details with room policies and provider offers.
- Saved hotels and watchlist persistence in browser local storage.
- A deliberate 15% price-drop simulation with net savings after the user-entered cancellation fee.
- A server-side policy assistant that retrieves relevant policy documents, exposes its sources, and optionally uses an LLM to generate a grounded answer.
- Responsive layouts for desktop and mobile.

## AI and retrieval

Without credentials, `/api/assistant` retrieves from the small policy corpus in `lib/hotels.ts` and returns deterministic policy-based responses. This is a transparent local retrieval demo, not an embedding/vector RAG implementation.

To enable model generation, copy `.env.example` to `.env.local` and set `AI_API_KEY` securely. `AI_MODEL` defaults to `gpt-4.1-mini`. The key stays server-side. Outbound HTTPS access to `api.openai.com` is required. The route supplies retrieved policies as context, asks the model to avoid unsupported claims, and falls back to the local response if the provider fails.

`GET /api/hotels?city=Goa` returns explicitly marked demo offers. `POST /api/assistant` accepts `{ "question": "What is Alila's cancellation policy?", "hotelId": "alila" }`.

## Scope and limitations

All offers, policies, review scores, and savings examples are sample data. Photos are illustrative Unsplash images, not verified photographs of the named hotels. Provider names illustrate the comparison concept; there is no affiliation or live inventory. Illustrative images are served locally; see `public/images/CREDITS.md` for sources. System fonts keep the app independent of external font services.

No reservation, payment, cancellation, background price polling, email notification, authentication, or multi-device persistence is implemented. The watchlist starts from a sample quote, not an imported real booking. Non-two-person searches deliberately show no demo offers. Do not use sample policies to make real cancellation decisions.

The first working slice runs as one Next.js application to avoid unnecessary infrastructure before live provider access is available. The planned production architecture adds a FastAPI integration/worker service, PostgreSQL + pgvector, Redis + Celery, and authenticated accounts.

## Next implementation stages

1. Obtain approved hotel API/affiliate access and implement provider adapters with provenance and fetch timestamps.
2. Normalize hotel identity, room, occupancy, dates, currency, taxes, meal plan, and cancellation conditions before matching offers.
3. Store verified bookings in PostgreSQL with accounts, consent, and validated booking-document extraction.
4. Schedule provider-compliant polling; calculate savings deterministically, respecting cancellation deadlines and fees; send opted-in notifications.
5. Add document ingestion and versioning, embeddings in pgvector, metadata-filtered retrieval, and grounded-answer evaluations.
6. Before public deployment, add API rate limits, request/body limits, authentication, monitoring, and retention controls.

Never automatically cancel the original booking before a replacement is confirmed.
