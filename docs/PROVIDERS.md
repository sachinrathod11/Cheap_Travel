# Connecting real pricing and AI

The main search at `/` opens `/web-search` for public hotel pages and cited findings. The homepage's comparison cards remain labelled sample data. `/explore` provides structured Amadeus offers and `/account` holds private tracked bookings. A provider quote is not a reservation, and the app does not cancel or purchase rooms.

## Public booking-site search without hotel API credentials

1. Update your checkout, run `npm ci` and `npm run db:init`, then configure `AI_API_KEY` and `AI_MODEL` in `.env.local`. You do not need Amadeus credentials for public-web research.
2. Run `npm run ai:web-check` to exercise the OpenAI Responses API with the hosted `web_search` tool. A successful `ai:check` text request does not establish tool support. If needed, explicitly set `AI_WEB_SEARCH_MODEL` to an account-accessible model that supports Responses web search; no other model is silently substituted. Web-search reasoning uses `AI_WEB_SEARCH_REASONING_EFFORT` when present, otherwise `AI_REASONING_EFFORT`. Use `low` for a model supporting it; explicitly leave the web-specific setting empty if choosing a model without reasoning controls.
3. Sign in and use the main hotel search or `/web-search`. Supply destination, exact dates, adults, optional hotel name and per-night INR budget. Public search is limited to six attempts per ten minutes per account to bound API usage.
4. The result must contain a completed web-search tool call and provider URL citations. Citation links are rendered inline and in the source list. Output without real search/citation evidence is rejected. Search timestamps describe when the search ran, not the freshness of every page.

The chat can also start public research when a signed-in customer explicitly supplies a complete stay, for example: "Search hotels in Goa from 2027-01-02 to 2027-01-04 for 2 adults." Missing dates (including year) or occupancy must be clarified first. The chat model returns a structured search request, the server validates it, and only then calls the web-search tool. Successful web findings appear with clickable citations in the chat. The same quota applies to chat and form searches. A failed tool call produces a search error, not a fabricated comparison.

This uses OpenAI's search tool, not the model's memory. It searches public pages where accessible and does not require a separate scraping-provider key or direct hotel API partnership for this research path. It has model/tool usage charges and cannot guarantee every travel site's coverage. Search engines may return cached/indexed material. Booking engines may hide date-specific rates behind JavaScript, sessions, sign-in or checkout. Snippets and from-prices are research leads, not verified equivalent rooms. Never use this output as the sole basis for cancelling a booking; web results cannot trigger price-drop alerts or enter the monitoring pipeline automatically. Always verify final dates, occupancy, room, meals, taxes and cancellation terms at the provider. The app does not bypass blocks or use rotating proxies.

## Hotel API access

1. Register at https://developers.amadeus.com/ and create an application in the Self-Service dashboard.
2. Request/use the Hotel List and Hotel Search APIs supported by your account. Copy the API key and secret into `.env.local` as `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET`.
3. Start with `AMADEUS_ENV=test`. Test inventory is for integration testing; it is not current market pricing. Test mode deliberately cannot produce savings alerts.
4. Restart the app. Open `/explore`, enter a three-letter city code, future check-in/check-out dates and adults. Search covers up to 20 hotels within the requested city area through one provider. No result means no quote was returned, not that the destination has no rooms.
5. For current inventory, apply for production access through Amadeus and check your endpoint permissions, commercial terms, quotas and billing. Set production credentials and `AMADEUS_ENV=production` only after access is approved. Free quotas and approval conditions may change; consult your provider dashboard.

This integration does not compare Booking.com, Agoda and MakeMyTrip against one another. The homepage's cross-site examples remain labelled sample data. A managed Google Hotels API can be added as a separate adapter after verifying its schema, licensing and room-level coverage. No proxy rotation or anti-bot bypass is implemented.

## AI and RAG

1. Create a server API key at https://platform.openai.com/ and enable API billing/access as required by your account. A ChatGPT subscription does not establish API credits.
2. Set `AI_API_KEY` privately in `.env.local`. Run `npm run ai:models` to list the exact API model IDs available to that account. A model label in ChatGPT or Codex is not automatically an API ID, and this app cannot use this chat session as its model backend.
3. Set `AI_MODEL` to an accessible text model that supports Chat Completions, structured JSON output and the selected reasoning effort. Set `AI_REASONING_EFFORT=low` for a reasoning model supporting low effort. Do not assume a model ID from a chat UI label; no model is silently substituted. Leave effort empty only if you deliberately choose a model without reasoning controls. Restart the app.
4. Ask about Cheap Travel hotel comparison, using the app, signed-in bookings, price checks and cancellation/rebooking costs. The assistant must redirect unrelated requests; general travel itineraries and other general-purpose conversation are outside its scope.

### If the chat shows app help instead of an AI response

Run `npm run ai:check` after saving `.env.local`. It sends a small real model request with the website's endpoint, reasoning and structured-output settings. Model listing alone does not verify those capabilities. Share only the diagnostic code and safe explanation if you need help, never the key or `.env.local`.

- `invalid_api_key`: replace the API key and restart the server.
- `model_unavailable`: the model ID is invalid or unavailable to the account; choose an accessible ID from `npm run ai:models` and verify its API capabilities.
- `quota_unavailable`: check API billing and spending limits separately from a ChatGPT subscription.
- `reasoning_unsupported` or `structured_output_unsupported`: choose a model supporting the requested settings. The app does not silently remove low reasoning or substitute a model.
- `network_error`, `access_denied` or `timeout`: check the server's outbound connection, proxy and allowed API destinations.

The chat header distinguishes AI responses from fallback app help. Greetings and comparison requests have short fallback replies, and supported city requests provide a link to the actual hotel search form. The chat does not claim to have fetched prices merely because a user names a destination.

Retrieval uses application help, PostgreSQL cancellation/comparison guides and owner-filtered booking records. Selected sample policies are explicitly labelled demo. This is retrieval-augmented generation; it does not use a vector database or embeddings. The system prompt confines the assistant to Cheap Travel, and structured responses let the server replace off-topic responses with a fixed redirect. Citations are filtered to retrieved sources. These controls are tested with mocked model outputs; prompt adherence must also be evaluated against the actual configured model. Current rates come from the pricing provider, not model memory. Booking passages selected for an answer are sent to the configured model provider. Without an API key or explicit model ID, the app shows only product help and retrieved evidence with a configuration notice. GET `/api/assistant` reports configuration status without exposing credentials.

## Monitoring and alerts

1. Sign in at `/account`, search `/explore`, and choose **Track my matching booking** on an offer with enough room detail.
2. Enter the total you actually paid and your current cancellation fee and deadline. Confirm that your original booking has the same room, bed configuration, dates, guests and meal plan. A manual hotel record has no provider link and supports manual price checks only.
3. On visiting the website or `/account`, eligible linked bookings are refreshed. Each booking is checked at most once every 30 minutes, and a job handles up to 10 due bookings to bound request time. Existing sample local-storage watches are not automatically imported.
4. To check while customers are away, generate a private `MONITOR_SECRET` with `openssl rand -base64 32`, add it to `.env.local`, and run `npm run monitor` in a second terminal while the app is running. `npm run monitor:once` performs one sweep. Never expose this secret in browser code.
5. See new candidate alerts and price history in `/account`. Check errors and timestamps are displayed per booking. Alerts are in-app; email/push delivery is not implemented.

Candidate net saving = original full-stay total − replacement quote − original cancellation fee. Savings must be strictly positive. Different currencies, different/unknown structured room details, unknown or expired cancellation deadlines, incomplete tax inclusion data, and test quotes cannot trigger automatic savings alerts. The customer must review replacement cancellation conditions, final charges and actual availability before acting. Similar rooms can be explored in search, but are not automatically labelled equivalent.

The app tracks price-check state. It does not verify an externally purchased reservation's confirmed/cancelled status; that requires the original provider's reservation API and authorization.

## AWS / Azure deployment

Deploy the Next.js server to a service supporting Node.js and connect it to a managed PostgreSQL database. Apply `npm run db:init` before serving traffic. Keep credentials in the platform's secret manager, use a private database network and HTTPS, and do not deploy the local Compose database password to a public database.

For scheduled checks, use an Azure Container Apps scheduled job or an AWS EventBridge-triggered task to execute `npm run monitor:once` against your HTTPS `APP_URL`, with `MONITOR_SECRET` set in both the app and job. Run frequently enough to process your number of bookings; the database throttle prevents redundant checks, and the advisory lock prevents concurrent sweeps. The in-process loop is for development and long-running worker services, not serverless request handlers.

Required HTTP destinations for cloud environment settings are `test.api.amadeus.com`, `api.amadeus.com` and `api.openai.com`. These must be allowed before live requests will work. No cloud deployment or environment publication is performed by these instructions.
