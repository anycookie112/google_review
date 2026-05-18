# Reviews Monitor — Franchise Demo

A proof-of-concept Next.js dashboard for monitoring Google reviews across multiple
franchise locations. Uses the **Google Places API (New)** for review data, with a
provider abstraction so the data source can be swapped to the **Google Business
Profile API** for a production rollout.

> ⚠️ **Demo build.** Google Places API only exposes a small public sample of reviews
> per place and does not include reply state or full review history. The dashboard
> derives sentiment, status, and suggested replies locally for demo purposes.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
#   Open .env.local and either:
#     a) Paste a Google Maps API key with "Places API (New)" enabled, OR
#     b) Leave GOOGLE_MAPS_API_KEY empty to run in Mock Mode.

# 3. Run
npm run dev
# → http://localhost:3000
```

The app auto-detects which mode to use:

| Mode             | Trigger                            | Badge in UI       |
| ---------------- | ---------------------------------- | ----------------- |
| Places API Mode  | `GOOGLE_MAPS_API_KEY` is set       | green "Places API Mode" |
| Demo Mode        | `GOOGLE_MAPS_API_KEY` is empty/unset | amber "Demo Mode" |

---

## Configuring stores

Open [`data/stores.ts`](data/stores.ts) and edit the `stores` array. Each entry needs:

```ts
{
  id: "klcc",                         // stable internal slug
  displayName: "Demo Franchise - KLCC",
  city: "Kuala Lumpur",
  region: "Central",
  managerName: "Alicia",
  googlePlaceId: "ChIJ...."           // Place ID from Google Maps
}
```

### Where to get a Google Place ID

1. Open <https://developers.google.com/maps/documentation/places/web-service/place-id>
   and use the Place ID Finder.
2. Or open the store on Google Maps, click the share button, and pull the place
   ID from the embed URL.
3. Paste the resulting ID (looks like `ChIJN1t_tDeuEmsRUsoyG83frY4`) into the
   `googlePlaceId` field.

Stores whose `googlePlaceId` still starts with `REPLACE_WITH_` are skipped and
surface in the dashboard's "errors" section in Places API mode.

---

## Architecture

```
src/
  app/
    api/places/reviews/route.ts   # GET endpoint the frontend calls
    page.tsx                       # Dashboard (RSC)
    reviews/                       # Reviews inbox (RSC + client filter)
    stores/[storeId]/              # Store detail (RSC)
  components/                      # UI primitives (cards, badges, etc.)
  lib/
    demoLogic.ts                   # DEMO-ONLY: sentiment, status, suggested reply
    loadReviews.ts                 # Server-side shared loader
    providers/
      ReviewProvider.ts            # Interface — any data source implements this
      GooglePlacesReviewProvider.ts
      MockReviewProvider.ts
      index.ts                     # resolveProvider() — picks one based on env
    stats.ts                       # Aggregation helpers
  types/index.ts                   # Shared TS types
data/stores.ts                     # Franchise store configuration
```

### Data flow

1. **Server**: `data/stores.ts` is read.
2. **Server**: `resolveProvider()` picks Google Places or Mock based on
   `GOOGLE_MAPS_API_KEY`.
3. **Server**: The provider fetches per-store data with `Promise.all`, isolating
   failures so one bad place ID doesn't break the rest of the dashboard.
4. **Server**: Results are normalized into the internal `StoreWithReviews`
   shape. Sentiment, status, and suggested replies are filled in by
   [`src/lib/demoLogic.ts`](src/lib/demoLogic.ts).
5. **Client**: The frontend calls only `/api/places/reviews` (or, for RSC
   pages, reads the same payload via `loadReviewsPayload()` on the server).
   It never talks to Google directly, so the API key is never exposed.

### API contract

`GET /api/places/reviews` returns:

```ts
{
  mode: "places" | "mock",
  data: StoreWithReviews[],          // see src/types/index.ts
  errors: {
    storeId: string,
    storeName: string,
    message: string,
  }[]
}
```

Per-store failures land in `errors` and the dashboard renders an error list at
the top of every page. Truly fatal failures return HTTP 500 with `errors`
containing a single `_global` entry.

---

## Swapping in Google Business Profile API

The whole point of the [`ReviewProvider`](src/lib/providers/ReviewProvider.ts)
interface is that you can replace the data source without touching the UI:

1. Create `src/lib/providers/BusinessProfileReviewProvider.ts` that implements
   the `ReviewProvider` interface.
2. Inside `getStoresWithReviews`, call the Business Profile API
   (`mybusinessbusinessinformation.googleapis.com`,
   `mybusiness.googleapis.com/v4/...`) for each store. Auth is OAuth, typically
   via a service account that the franchise has granted manager access to.
3. Map the response into `StoreWithReviews`. With Business Profile API you can
   populate real values for `status` (replied vs not), include the reply text,
   and fetch full review history — so you'll delete most of `demoLogic.ts`
   along the way.
4. Update `resolveProvider()` in
   [`src/lib/providers/index.ts`](src/lib/providers/index.ts) to pick the new
   provider when the relevant credentials are configured.

The route handler, all three pages, and every component stay unchanged.

---

## Security notes

- `GOOGLE_MAPS_API_KEY` is read server-side only. It is never sent to the
  browser and never appears in client bundles. Audit by searching the
  `.next/static/` bundle for the value after `npm run build`.
- All Google API calls happen in the Node.js runtime via the API route or RSC
  loader.
- Per-store fetches are independent — one failed store does not crash the
  dashboard.
- Restrict the API key on Google Cloud Console to the Places API (New) and to
  your server's IP / referrer.

---

## Scripts

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run start      # Run production build
npm run lint       # Next.js lint
npm run typecheck  # tsc --noEmit
```

---

## Roadmap (for the real product)

- [ ] Swap `GooglePlacesReviewProvider` for `BusinessProfileReviewProvider`.
- [ ] Persist review state (replied / archived) in a database — currently
      derived from the rating for demo purposes.
- [ ] Replace the template-based suggested reply generator with an LLM call
      (Claude / Vertex AI) that takes the review text into account.
- [ ] Add per-user auth so franchise managers only see their own branches.
- [ ] Add Slack / email alerts on new 1–2 star reviews.
