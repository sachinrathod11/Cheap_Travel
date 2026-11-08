# Nearby hotels and external hotel bookings

This milestone covers hotel reservations first. Transport-ticket checkout is not integrated.

## Use the feature

```sh
git pull
npm ci
docker compose up -d --wait db
npm run db:init
npm run dev
```

Sign in, then open **Nearby hotels** (`/nearby`). Homepage searches for Goa or Jaipur also open this locator; other destinations use public-web research.

Choose a region and a reference point. Goa includes Dabolim and Mopa airports, Madgaon and Thivim railway stations, and Panaji/Calangute/Colva areas. Jaipur includes its international airport, Jaipur Junction and the Pink City area. Reference coordinates are approximate map points, not airport/station entrances. Inspect the map link or choose custom coordinates if you need a different point. Custom points are restricted to approximate Goa/Jaipur search-area bounds; these are not official administrative boundary polygons.

Set a radius of 1–50 km and optional accommodation type, mapped star category and website filter. The server calculates great-circle distance using coordinates and excludes points outside the radius **before rounding**. Distances are straight-line measurements, not road distance or travel time. Results are sorted by distance and paginated in sets of 40.

The catalog uses OpenStreetMap via Overpass. It has no separate API-key requirement, but the server must be permitted to reach **`overpass-api.de`**. The current managed cloud network denied that destination during this task; live map discovery was therefore not verified here. Map parsing and the end-to-end flow were tested with isolated fixtures. Normal Mac deployment still depends on actual endpoint availability; public-service limits/timeouts may require a smaller radius or, at scale, a dedicated data service.

Coverage is not exhaustive. Addresses, website URLs, phone numbers and star categories are community-mapped information and can be absent or outdated. A listed website is not independently verified as the hotel's official domain. Results show OpenStreetMap attribution and source/map links. Map queries are cached for six hours; stale cached results are labelled if refresh fails. The app does not substitute sample hotels after a failed live request.

## Budget and price research

Map data has **no dated room prices**. The budget field is a target carried into **Research this hotel's prices & booking links**; it does not prove all listed hotels are within budget or hide out-of-budget rooms whose price is unknown. This link preserves the selected hotel, stay dates, adults, reference and radius. Public-web research still requires the AI API connection and can return incomplete/unverified pricing leads. Confirm property identity, room conditions and final total at the provider.

## Saving the booking handoff

1. Select **Save visit & open site** on a hotel card or on a source for a specifically named hotel in web research.
2. The app saves the intended hotel, stay, public destination URL and any supplied pre-booking amount (unverified), then routes you to that site. Only the signed-in owner can open the saved redirect or view its details. Personal login/session URLs are rejected. Ordinary map links and research citations are not silently interpreted as purchase events.
3. Opening the link records an **opened** visit, not a completed booking. The app cannot inspect the other site's cookies, checkout, payment, or confirmation page. Browser focus/page-return events refresh pending reminders; the app does not recursively crawl private checkout pages.
4. On returning to the homepage, locator, web-search page or account, follow the reminder. Choose **I booked — add paid total**, enter the actual room, meals, dates, guests, full amount paid (INR), cancellation fee and deadline, and explicitly confirm. Or choose **I didn't book**.
5. Confirmation creates the tracked booking and its original price snapshot in one database transaction. Retrying or double-clicking confirmation reuses the same booking. The actual paid amount is kept separate from an unverified amount saved before leaving. These records are labelled as customer-reported, not provider-verified reservations.

Actual automatic purchase confirmation would require a provider reservation API, signed affiliate postback/webhook or confirmation import. An outbound click alone cannot establish what was purchased or paid.

## Rechecking after booking

**Research this same stay again** uses the saved hotel, destination, dates and guests. Manual price checks add to its history; existing scheduled monitoring continues only for matching structured provider-linked bookings. A map listing or customer-confirmed website visit does not create a provider ID or enable automatic price alerts. The savings rule remains: replacement full total + cancellation cost must be less than the original full total, with equivalent terms and a valid cancellation window.

## Verification

Run `npm test` for geometry, boundary validation, safe URLs and confirmation input checks. After a production build, `npm run test:locations` starts a temporary fixture server and isolated schema in a **local** development PostgreSQL database. It tests radius/star filtering, private redirects, click-not-purchase state, concurrent idempotent confirmation, actual paid totals and dismissals, then removes its schema and server. It requires permission to create a schema. Never load test provider preloads in a deployed server. These tests do not establish live hotel coverage or prices.
