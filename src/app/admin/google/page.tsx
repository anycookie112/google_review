import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import { findUserById } from "@/lib/db/users";
import { getGoogleConnectionWithAccounts } from "@/lib/google/connection";
import { isGoogleOauthConfigured } from "@/lib/google/config";

export const dynamic = "force-dynamic";

const FLASH_MESSAGES: Record<string, string> = {
  connected: "Google Business Profile connection updated.",
  disconnected: "Google Business Profile connection removed.",
};

const ERROR_MESSAGES: Record<string, string> = {
  forbidden: "You do not have permission to manage the Google connection.",
  missing_config:
    "Google OAuth is not configured yet. Add the client ID, client secret, and redirect URI first.",
  invalid_state:
    "The Google OAuth callback could not be verified. Try connecting again from the admin page.",
  oauth_denied: "Google sign-in was canceled or denied before the app could connect.",
  no_refresh_token:
    "Google did not return a refresh token. Reconnect with consent again so the app can sync in the background.",
  token_exchange_failed:
    "Google returned an error while finishing the OAuth exchange. Double-check your redirect URI and OAuth app settings.",
};

export default async function AdminGooglePage({
  searchParams,
}: {
  searchParams?: { message?: string; error?: string };
}) {
  const currentUser = await requireAdminUser();
  const googleConfigured = isGoogleOauthConfigured();
  const { connection, accounts, error: connectionError } = googleConfigured
    ? await getGoogleConnectionWithAccounts()
    : { connection: null, accounts: [], error: null };
  const connectedByUser =
    connection?.connectedByUserId != null
      ? await findUserById(connection.connectedByUserId)
      : null;

  const flashMessage = FLASH_MESSAGES[searchParams?.message ?? ""];
  const errorMessage = ERROR_MESSAGES[searchParams?.error ?? ""] || connectionError;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Google Business Profile</h1>
          <p className="text-sm text-slate-500">
            Connect the invited Google manager account that this app should use for GBP syncs.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right shadow-card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Signed in as</div>
          <div className="text-sm font-semibold text-slate-900">{currentUser.displayName}</div>
          <div className="text-xs text-slate-500">{currentUser.email}</div>
        </div>
      </header>

      {flashMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {flashMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white shadow-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">OAuth status</h2>
          <p className="text-xs text-slate-500">
            This is separate from your workspace login. It connects one Google account for the
            server-side GBP sync.
          </p>
        </div>

        {!googleConfigured ? (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            Add <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, and{" "}
            <code>GOOGLE_REDIRECT_URI</code> to <code>.env</code>, then restart the app.
          </div>
        ) : !connection ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              No Google account is connected yet.
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/api/google/oauth/start"
                className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Connect Google account
              </a>
              <Link
                href="/admin/users"
                className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to users
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="Connected Google user" value={connection.googleEmail} />
              <InfoCard label="Google display name" value={connection.googleName} />
              <InfoCard
                label="Connected by"
                value={connectedByUser?.displayName || `User #${connection.connectedByUserId}`}
                hint={connectedByUser?.email}
              />
              <InfoCard
                label="Last validated"
                value={connection.lastValidatedAt ? formatDate(connection.lastValidatedAt) : "Not yet"}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Scopes</div>
              <div className="mt-2 text-sm text-slate-700 break-all">
                {connection.scope || "Google did not return scopes in the token response."}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/api/google/oauth/start"
                className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Reconnect Google account
              </a>
              <form action="/api/google/oauth/disconnect" method="post">
                <button
                  type="submit"
                  className="inline-flex rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Disconnect
                </button>
              </form>
            </div>
          </div>
        )}
      </section>

      {connection ? (
        <section className="rounded-lg border border-slate-200 bg-white shadow-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Accessible business accounts</h2>
            <p className="text-xs text-slate-500">
              These are the Business Profile accounts Google says the connected user can access.
            </p>
          </div>

          {accounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              No accessible business accounts were returned yet. If the account should see a client
              business, confirm the Google manager invite was accepted and the project has GBP API
              approval.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">Account</th>
                    <th className="text-left font-medium px-4 py-2">Resource name</th>
                    <th className="text-left font-medium px-4 py-2">Type</th>
                    <th className="text-left font-medium px-4 py-2">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map((account) => (
                    <tr key={account.name} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-900">{account.accountName}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{account.name}</td>
                      <td className="px-4 py-3 text-slate-700">{account.type}</td>
                      <td className="px-4 py-3 text-slate-700">{account.role || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function InfoCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | null;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-card">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900 break-words">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500 break-words">{hint}</div> : null}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
