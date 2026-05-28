# Reviews Monitor

A proof-of-concept Next.js dashboard for monitoring Google reviews across multiple
franchise locations. It now prefers the **Google Business Profile API** whenever
an admin has connected a manager account, and falls back to the **Google Places
API (New)** or mock data when GBP is not available. The app includes a simple
**Postgres-backed login system** so it can be moved to a new machine with only
an `.env` file and a Postgres instance.

> ⚠️ **Still an MVP.** Business Profile mode now pulls live locations and reviews
> with real reply state. Places mode remains available only as a fallback and still
> has the usual sample-size limitations.

---

## Quick start

```bash
# 1. Configure env
cp .env.example .env

# 2. Start Postgres
docker compose up -d db

# 3. Install dependencies
npm install

# 4. Run the app
npm run dev
# → http://127.0.0.1:3000
```

Sign in with the bootstrap admin configured in `.env`:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

On the first request, the app creates its `app_users` table automatically and
inserts that admin user if it does not already exist.

Everyone else uses the self-service onboarding flow:

1. Open `/register` and submit name + email.
2. An admin sees the request in `/admin/users`.
3. The admin approves the request and can copy the setup link from the admin UI.
4. The user opens that setup link, creates a password, and then signs in at `/login`.

Once an admin is signed in, they can:

1. connect the shared Google Business Profile account from `/admin/google`
2. manage stores from `/admin/stores`
3. run manual syncs from `/admin/sync`

The app auto-detects which mode to use in this order:

| Mode                  | Trigger                                   | Badge in UI |
| --------------------- | ----------------------------------------- | ----------- |
| Business Profile Mode | admin has connected Google at `/admin/google` | blue "Business Profile Mode" |
| Places API Mode       | no GBP connection, but `GOOGLE_MAPS_API_KEY` is set | green "Places API Mode" |
| Demo Mode             | neither GBP nor Places is configured      | amber "Demo Mode" |

---

## Auth and database

- User login is protected by middleware and cookie-based sessions.
- User records live in Postgres in the `app_users` table.
- Store configuration lives in Postgres in the `stores` table.
- Reviews live in Postgres in the `reviews` and `review_replies` tables.
- Sync history lives in Postgres in the `review_sync_runs` table.
- Google OAuth tokens for the shared GBP connection also live in Postgres.
- The session cookie is signed with `AUTH_SECRET`.
- The bootstrap admin comes from `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`.
- New users start as `pending_approval`, then move through
  `approved_setup_pending` and finally `active`.
- Admins manage approvals and roles from `/admin/users`.
- The current auth system is intentionally small and leaves room to grow into
  store-level roles later.

For local development, the included [`compose.yaml`](compose.yaml) is enough to
start Postgres on a new machine:

```bash
docker compose up -d db
```

If you move the project to a new environment, you only need:

1. the codebase
2. a copied `.env`
3. `docker compose up -d db`
4. `npm install && npm run dev`

For a production-style process on the same machine:

```bash
npm run build
npm run start:prod
```

For Google Business Profile OAuth, also set:

1. `GOOGLE_CLIENT_ID`
2. `GOOGLE_CLIENT_SECRET`
3. `GOOGLE_REDIRECT_URI`

Then sign in as an admin and open `/admin/google` to connect the invited Google
manager account.

---

## Sync and persistence

The dashboard now prefers persisted review data once at least one sync has run.

Recommended flow:

1. configure stores in `/admin/stores`
2. connect Google in `/admin/google`
3. run a sync in `/admin/sync`
4. let the dashboard read from Postgres instead of hitting Google on every page load

This helps with:

- handling 10-15 concurrent users without duplicating Google API calls
- keeping review history across restarts and machine moves
- showing store-level sync failures
- preparing for scheduled syncs later

Manual syncs:

- `POST /api/admin/sync/run`

Scheduler / cron syncs:

- `POST /api/internal/sync`
- requires `SYNC_CRON_SECRET`
- accepts either `Authorization: Bearer <secret>` or `x-sync-secret: <secret>`

Health check:

- `GET /api/health`

---

## Configuring stores

The app now reads stores from the Postgres `stores` table, and `/admin/stores`
is the preferred way to manage them.

On the very first boot, if that table is empty, the app seeds it from
[`data/stores.ts`](data/stores.ts). After that, the database is the source of
truth.

The seeded/default shape for each store is:

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

For now, the easiest ways to change stores are:

1. Use `/admin/stores`
2. Edit [`data/stores.ts`](data/stores.ts) before first boot on a fresh DB.
3. Or update rows directly in Postgres once the DB already exists.

Stores are matched to GBP locations in this order:

1. exact GBP account/location resource names, if stored
2. `googlePlaceId` matched against GBP `metadata.placeId`
3. unique title match as a last resort

If `googlePlaceId` is empty or wrong, GBP matching becomes much harder, so keep
those IDs accurate even if you no longer rely on Places as a fallback.

---

## Architecture

```
src/
  app/
    admin/google/page.tsx          # Admin-only Google OAuth connection page
    admin/stores/page.tsx          # Store administration UI
    admin/sync/page.tsx            # Sync history + manual sync UI
    admin/users/page.tsx           # Admin approval + role management UI
    api/admin/stores/...           # Create/update store actions
    api/admin/sync/run/route.ts    # Manual sync trigger
    api/admin/users/...            # Approve, reject, update role
    api/auth/activate/route.ts     # Finalize password after approval
    api/auth/login/route.ts      # Form POST → create session cookie
    api/auth/logout/route.ts     # Form POST → clear session cookie
    api/auth/register/route.ts   # Public registration request
    api/health/route.ts           # Health check endpoint
    api/internal/sync/route.ts    # Secret-protected scheduler sync endpoint
    api/google/oauth/...          # Start/callback/disconnect Google OAuth
    api/places/reviews/route.ts   # GET endpoint the frontend calls
    login/page.tsx                # Protected app sign-in screen
    register/page.tsx             # Public registration form
    register/status/page.tsx      # Pending/approved/rejected onboarding page
    page.tsx                       # Dashboard (RSC)
    reviews/                       # Reviews inbox (RSC + client filter)
    stores/[storeId]/              # Store detail (RSC)
  components/                      # UI primitives (cards, badges, etc.)
  lib/
    auth/                          # Session signing, cookie helpers, guards
    db/                            # Postgres pool + bootstrap queries
    google/                        # Google OAuth + Business Profile helpers
    reviews/sync.ts                # Provider -> Postgres sync pipeline
    demoLogic.ts                   # DEMO-ONLY: sentiment, status, suggested reply
    loadReviews.ts                 # Server-side shared loader (DB-first)
    providers/
      ReviewProvider.ts            # Interface — any data source implements this
      GoogleBusinessProfileReviewProvider.ts
      GooglePlacesReviewProvider.ts
      MockReviewProvider.ts
      index.ts                     # resolveProvider() — GBP first, then Places, then Mock
    stats.ts                       # Aggregation helpers
  types/index.ts                   # Shared TS types
data/stores.ts                     # First-run store seed data
middleware.ts                      # Redirect unauthenticated users to /login
```

### Data flow

1. **Server**: `loadReviewsPayload()` reads active stores from Postgres.
2. **Server**: If synced review data already exists, the loader serves it from
   Postgres.
3. **Server**: Otherwise, `resolveProvider()` prefers a connected Google
   Business Profile account, then falls back to Places, then Mock.
4. **Server**: Sync runs normalize provider results into the internal
   `StoreWithReviews` shape and persist them. In GBP mode, review reply state
   comes from the real API response. In fallback modes, sentiment and
   suggestions still come from
   [`src/lib/demoLogic.ts`](src/lib/demoLogic.ts).
5. **Client**: The frontend calls only `/api/places/reviews` (or, for RSC
   pages, reads the same payload via `loadReviewsPayload()` on the server).
   It never talks to Google directly, so the API key is never exposed.

### API contract

`GET /api/places/reviews` returns:

```ts
{
  mode: "business_profile" | "places" | "mock",
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

## Business Profile mode

When a Google manager account is connected in `/admin/google`, the dashboard now:

1. uses the shared OAuth refresh token stored in Postgres
2. lists accessible GBP accounts
3. lists locations under those accounts with Business Information API
4. matches those locations to your internal stores, preferably by `googlePlaceId`
5. fetches full reviews and reply state from the Reviews API

The frontend route contract stays the same, so the dashboard pages and components
do not need to know whether the source is GBP, Places, or Mock.

---

## Deployment

This repo now includes:

- `compose.yaml` for local Postgres
- `Dockerfile` for the Next.js app
- `/api/health` for health checks
- `/api/internal/sync` for scheduler-triggered syncs

Example Docker flow:

```bash
docker build -t reviews-monitor .
docker run --rm -p 3000:3000 --env-file .env reviews-monitor
```

---

## Security notes

- `GOOGLE_MAPS_API_KEY` is optional now. If you keep it for fallback mode, it is
  still read server-side only and never sent to the browser.
- `AUTH_SECRET` must be set and kept private. It signs every session cookie.
- Passwords are stored as bcrypt hashes in Postgres, not in plain text.
- Registration setup links are bearer links. Treat them like temporary secrets
  until the user completes password setup.
- The current Google OAuth implementation stores the GBP refresh token in
  Postgres so the server can sync while users are offline.
- `SYNC_CRON_SECRET` should be set before exposing `/api/internal/sync`.
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
npm run db:up      # Start local Postgres via Docker Compose
npm run db:down    # Stop local Postgres
npm run db:logs    # Tail Postgres logs
npm run funnel     # Start dev server + expose via Tailscale Funnel
npm run build      # Production build
npm run start      # Run production build
npm run start:prod # Build + start via helper script
npm run lint       # Next.js lint
npm run typecheck  # tsc --noEmit
```

---

## Roadmap (for the real product)

- [ ] Replace the template-based suggested reply generator with an LLM call
      (Claude / Vertex AI) that takes the review text into account.
- [ ] Add store-level permissions so franchise managers only see their own branches.
- [ ] Add Slack / email alerts on new 1–2 star reviews.
