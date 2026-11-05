# Connecting real pricing and AI

The app has separate paths for `/` (the original labelled sample comparison), `/explore` (Amadeus hotel offers), and `/account` (your private tracked bookings). A provider quote is not a reservation, and the app does not cancel or purchase rooms.

## Hotel API access

1. Register at https://developers.amadeus.com/ and create an application in the Self-Service dashboard.
2. Request/use the Hotel List and Hotel Search APIs supported by your account. Copy the API key and secret into `.env.local` as `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET`.
3. Start with `AMADEUS_ENV=test`. Test inventory is for integration testing; it is not current market pricing. Test mode deliberately cannot produce savings alerts.
4. Restart the app. Open `/explore`, enter a three-letter city code, future check-in/check-out dates and adults. Search covers up to 20 hotels within the requested city area through one provider. No result means no quote was returned, not that the destination has no rooms.
5. For current inventory, apply for production access through Amadeus and check your endpoint permissions, commercial terms, quotas and billing. Set production credentials and `AMADEUS_ENV=production` only after access is approved. Free quotas and approval conditions may change; consult your provider dashboard.

This integration does not compare Booking.com, Agoda and MakeMyTrip against one another. The homepage's cross-site examples remain labelled sample data. A managed Google Hotels API can be added as a separate adapter after verifying its schema, licensing and room-level coverage. No proxy rotation or anti-bot bypass is implemented.

## AI and RAG

1. Create a server API key at https://platform.openai.com/ and enable API billing/access as required by your account. A ChatGPT subscription does not establish API credits.
2. Set `AI_API_KEY` and optionally `AI_MODEL` in `.env.local`. Restart the app.
3. Ask the assistant about travel planning for any destination, or sign in and ask about your booking's room, dates and cancellation terms.

Retrieval uses PostgreSQL full-text search over the seeded planning/cancellation guides and owner-filtered booking records. Selected sample policies are explicitly labelled demo. This is retrieval-augmented generation; it does not use a vector database or embeddings. The model may offer general travel guidance, but current rates come from the pricing provider, not model memory. Booking passages selected for an answer are sent to the configured model provider. Without an AI key, the app shows retrieved passages and an explicit configuration notice.

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
