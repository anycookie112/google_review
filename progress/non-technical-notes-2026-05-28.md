# Non-Technical Notes - 2026-05-28

## Goal for today

Move the app from demo-only direction toward a real internal review-monitoring
tool that can be used by a small team and eventually connect to a client's
Google Business Profile account.

## Product / workflow decisions made

- The app will use normal app login for staff users.
- Google OAuth is separate from user login and is only for the shared Business
  Profile connection.
- Users should follow this onboarding flow:
  1. open the app
  2. register with name + email
  3. wait for admin approval
  4. come back and set password
  5. log in normally after approval
- The app should be easy to move to a new computer/environment with minimal
  setup.
- Postgres was chosen as the database.
- Google Business Profile API is the real target integration.
- Google Places should only remain as a fallback, not the main production path.

## Google / client-side progress

- Confirmed that manager access on the client's Business Profile is needed for
  the Google account used in OAuth.
- Confirmed that project approval for GBP API access is separate from being
  invited as a manager.
- Set up the Google Cloud OAuth client and client secret for the project.
- Enabled the relevant Google APIs in the Cloud project.
- Confirmed the working local callback origin should use `127.0.0.1` for this
  machine instead of `localhost`.

## Business Profile API approval progress

- Submitted the Business Profile API allowlist / access request for project:
  `12853147168`
- Google opened support case:
  `1-9727000041487`
- Current review estimate from Google:
  `7-10 business days`

## Important understanding from today

- The allowlist form is for project eligibility, not for selecting every single
  store the app will later access.
- Only one qualifying verified business/profile usually needs to be selected in
  the request flow.
- After approval, the app can access the locations available to the invited
  manager account, not only the one chosen during the request.

## External blockers

- Live GBP extraction is currently blocked by Google's pending project approval.
- Until approval lands, the app may connect through OAuth but GBP account lookup
  can still fail with quota `0 QPM`.

## Practical follow-up

- Watch the email inbox used for the GBP access request.
- Re-check GBP quota later in Google Cloud.
- Retry the Google connection flow after approval is granted.
