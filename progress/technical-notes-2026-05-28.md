# Technical Notes - 2026-05-28

## Scope

Work today was focused on turning the Next.js review dashboard into a real app
with local auth, Postgres, admin approval flow, and Google Business Profile
OAuth groundwork.

## App/Auth foundation

- Added Postgres-backed app setup so the project can be moved to a new machine
  with an `.env` file plus a Postgres instance.
- Added local Docker database setup with `compose.yaml`.
- Added bootstrap admin support through env vars: `ADMIN_EMAIL`,
  `ADMIN_PASSWORD`, `ADMIN_NAME`, `AUTH_SECRET`, and `DATABASE_URL`.
- Added cookie-based login/session handling.
- Protected the app with middleware so unauthenticated users are redirected to
  `/login`.

## User onboarding and admin approval

- Added public registration flow:
  user enters name + email, the request is saved in Postgres, and the user
  waits for approval.
- Added admin user-management UI for approving users, rejecting users, changing
  roles, and sharing setup links for approved users.
- Added password setup / activation step after approval.
- Current user lifecycle is `pending_approval` -> `approved_setup_pending` ->
  `active`.

## Store/data foundation

- Moved store source-of-truth into Postgres.
- Kept `data/stores.ts` only as first-run seed data.
- Updated loaders so the dashboard now reads stores from the database instead of
  relying only on hardcoded in-memory config.

## Google OAuth and GBP groundwork

- Added admin-only Google connect page at `/admin/google`.
- Added Google OAuth routes for start, callback, and disconnect.
- Added Postgres persistence for the shared Google connection / token record.
- Added env support for `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
  `GOOGLE_REDIRECT_URI`.

## Business Profile provider work

- Added a `GoogleBusinessProfileReviewProvider`.
- Updated provider resolution order to:
  1. connected Google Business Profile account
  2. Google Places fallback
  3. mock fallback
- Added logic to list accessible GBP accounts, list locations, match stores to
  locations, fetch reviews, and use real reply state where available.

## Redirect / local-dev cleanup

- Fixed app redirects to use relative paths so local sessions do not bounce from
  `127.0.0.1` to `localhost`.
- Standardized local testing around `http://127.0.0.1:3000`.
- Updated Google OAuth callback usage to
  `http://127.0.0.1:3000/api/google/oauth/callback`.

## Docs/setup improvements

- Updated `README.md` to reflect Postgres setup, auth flow, admin approval
  flow, Google connection flow, and provider priority.
- Expanded `.env.example` for the new app/db/auth/Google setup.

## Current technical status

- Local app runs with Next.js dev server.
- Local Postgres runs through Docker Compose.
- Login and registration flow are in place.
- Admin approval flow is in place.
- Google OAuth flow is wired into the app.
- Business Profile provider code is in place.

## Current blocker

- Google Business Profile API project quota is still `0 QPM`, so live GBP API
  calls are blocked until Google approves the allowlist request for the Cloud
  project.

## Recommended next technical step

- Add review persistence and sync tables in Postgres so the dashboard reads from
  stored review data instead of live Google fetches on every request.
