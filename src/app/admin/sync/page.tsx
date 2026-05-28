import { requireAdminUser } from "@/lib/auth";
import { getReviewStorageStats, getLatestSyncRun, listRecentSyncRuns } from "@/lib/db/reviews";
import { listAllStores } from "@/lib/db/stores";

export const dynamic = "force-dynamic";

const FLASH_MESSAGES: Record<string, string> = {
  synced: "Sync completed successfully.",
  partial: "Sync completed with some store-level failures.",
};

const ERROR_MESSAGES: Record<string, string> = {
  sync_failed:
    "The sync could not complete. Check the Google connection, store mapping, or API approval status.",
  forbidden: "You do not have permission to run syncs.",
  missing_secret: "The scheduled sync secret has not been configured yet.",
};

export default async function AdminSyncPage({
  searchParams,
}: {
  searchParams?: { message?: string; error?: string };
}) {
  const currentUser = await requireAdminUser();
  const [stats, latestRun, recentRuns, stores] = await Promise.all([
    getReviewStorageStats(),
    getLatestSyncRun(),
    listRecentSyncRuns(8),
    listAllStores(),
  ]);

  const failedStores = stores.filter((store) => store.lastReviewSyncStatus === "failed");
  const neverSyncedStores = stores.filter((store) => !store.lastReviewSyncAt);
  const flashMessage = FLASH_MESSAGES[searchParams?.message ?? ""];
  const errorMessage = ERROR_MESSAGES[searchParams?.error ?? ""];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Review sync</h1>
          <p className="text-sm text-slate-500">
            Pull review data into Postgres so the dashboard can run from stored data.
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

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Persisted reviews" value={stats.reviewCount} />
        <SummaryCard label="Stores with sync data" value={stats.syncedStoreCount} />
        <SummaryCard label="Never synced stores" value={neverSyncedStores.length} />
        <SummaryCard label="Stores with failures" value={failedStores.length} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Run a manual sync</h2>
            <p className="text-xs text-slate-500">
              This fetches live data from the current provider and writes it into Postgres.
            </p>
          </div>
          <form action="/api/admin/sync/run" method="post">
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Sync now
            </button>
          </form>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <InfoCard
            label="Latest sync status"
            value={latestRun?.status ?? "never"}
            hint={latestRun?.summaryMessage ?? "No sync has run yet."}
          />
          <InfoCard
            label="Latest provider mode"
            value={latestRun?.providerMode ?? "—"}
            hint={stats.latestSyncAt ? formatDate(stats.latestSyncAt) : "No sync timestamp yet."}
          />
          <InfoCard
            label="Latest finished"
            value={latestRun?.finishedAt ? formatDate(latestRun.finishedAt) : "Still running / never"}
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Recent sync history</h2>
          <p className="text-xs text-slate-500">
            Track manual or scheduled sync runs and spot partial failures quickly.
          </p>
        </div>

        {recentRuns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No sync runs recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Started</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Mode</th>
                  <th className="px-4 py-2 text-right font-medium">Stores</th>
                  <th className="px-4 py-2 text-right font-medium">Reviews</th>
                  <th className="px-4 py-2 text-left font-medium">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{formatDate(run.startedAt)}</td>
                    <td className="px-4 py-3">
                      <RunStatusPill status={run.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">{run.providerMode ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {run.storesSucceeded}/{run.storesTotal}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {run.reviewsUpserted}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{run.summaryMessage ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Store sync watchlist</h2>
          <p className="text-xs text-slate-500">
            Stores with no sync yet or the most recent store-level failure.
          </p>
        </div>

        {failedStores.length === 0 && neverSyncedStores.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No watchlist items right now.
          </div>
        ) : (
          <div className="space-y-3">
            {[...failedStores, ...neverSyncedStores.filter((store) => store.lastReviewSyncStatus !== "failed")].map(
              (store) => (
                <div
                  key={store.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{store.displayName}</div>
                      <div className="text-xs text-slate-500">
                        {store.city} · {store.region}
                      </div>
                    </div>
                    <RunStatusPill status={store.lastReviewSyncStatus ?? "never"} />
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    {store.lastReviewSyncError
                      ? store.lastReviewSyncError
                      : "This store has not been synced yet."}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-card">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function InfoCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function RunStatusPill({
  status,
}: {
  status: "never" | "running" | "success" | "failed" | "partial";
}) {
  const styles: Record<typeof status, string> = {
    never: "bg-slate-100 text-slate-700",
    running: "bg-sky-100 text-sky-800",
    success: "bg-emerald-100 text-emerald-800",
    failed: "bg-rose-100 text-rose-800",
    partial: "bg-amber-100 text-amber-800",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
