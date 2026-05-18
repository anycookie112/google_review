import Link from "next/link";
import { loadReviewsPayload } from "@/lib/loadReviews";
import { aggregate, flattenReviews, sortRecent } from "@/lib/stats";
import { ModeBadge } from "@/components/ModeBadge";
import { DemoBanner } from "@/components/DemoBanner";
import { LimitationsCard } from "@/components/LimitationsCard";
import { StatCard } from "@/components/StatCard";
import { RatingStars } from "@/components/RatingStars";
import { SentimentBadge, StatusBadge } from "@/components/Badges";
import { ErrorList } from "@/components/ErrorList";
import { EmptyState } from "@/components/States";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { mode, data, errors } = await loadReviewsPayload();
  const stats = aggregate(data);
  const allReviews = flattenReviews(data);
  const recent = sortRecent(allReviews).slice(0, 6);
  const negatives = allReviews.filter((r) => r.review.sentiment === "negative");
  const worst = [...data]
    .filter((s) => typeof s.rating === "number")
    .sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Public review signals across all franchise locations.
          </p>
        </div>
        <ModeBadge mode={mode} />
      </header>

      {mode === "places" ? <DemoBanner /> : null}
      <ErrorList errors={errors} />

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Stores" value={stats.totalStores} />
        <StatCard
          label="Avg rating"
          value={stats.averageRating == null ? "—" : stats.averageRating.toFixed(1)}
          hint="Across configured stores"
        />
        <StatCard
          label="Public reviews"
          value={stats.totalPublicReviewCount.toLocaleString()}
          hint="Total count (Google)"
        />
        <StatCard
          label="Negative visible"
          value={stats.visibleNegativeCount}
          hint={`${stats.visibleReviewCount} visible reviews`}
          tone={stats.visibleNegativeCount > 0 ? "negative" : "default"}
        />
        <StatCard
          label="Needs reply"
          value={stats.needsReplyCount}
          tone={stats.needsReplyCount > 0 ? "warning" : "default"}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Store performance</h2>
            <p className="text-xs text-slate-500">Rating, public review count, and visible reviews.</p>
          </div>
          {data.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No store data yet"
                hint="Check the errors above or configure Place IDs in data/stores.ts."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">Store</th>
                    <th className="text-left font-medium px-4 py-2">Region</th>
                    <th className="text-left font-medium px-4 py-2">Manager</th>
                    <th className="text-left font-medium px-4 py-2">Rating</th>
                    <th className="text-right font-medium px-4 py-2">Reviews</th>
                    <th className="text-right font-medium px-4 py-2">Negatives visible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((store) => {
                    const neg = store.reviews.filter((r) => r.sentiment === "negative").length;
                    return (
                      <tr key={store.storeId} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/stores/${store.storeId}`}
                            className="font-medium text-slate-900 hover:text-brand-600"
                          >
                            {store.storeName}
                          </Link>
                          <div className="text-xs text-slate-500">{store.city}</div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{store.region}</td>
                        <td className="px-4 py-2.5 text-slate-700">{store.managerName}</td>
                        <td className="px-4 py-2.5">
                          <RatingStars rating={store.rating} />
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {store.totalReviewCount?.toLocaleString() ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {neg > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-xs font-medium">
                              {neg}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white shadow-card p-5">
            <h2 className="text-sm font-semibold text-slate-900">Worst rated stores</h2>
            <p className="text-xs text-slate-500">Lowest public rating first.</p>
            {worst.length === 0 ? (
              <div className="mt-3 text-xs text-slate-500">No rating data available.</div>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {worst.map((store) => (
                  <li key={store.storeId} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/stores/${store.storeId}`}
                      className="text-sm font-medium text-slate-800 hover:text-brand-600 truncate"
                    >
                      {store.storeName}
                    </Link>
                    <RatingStars rating={store.rating} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <LimitationsCard />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white shadow-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Recent visible reviews</h2>
            <Link href="/reviews" className="text-xs text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="mt-3 text-xs text-slate-500">No reviews to show yet.</div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {recent.map(({ review, storeName, storeId }) => (
                <li key={`${storeId}-${review.id}`} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {review.authorName}
                    </div>
                    <RatingStars rating={review.rating} />
                  </div>
                  <div className="text-xs text-slate-500">{storeName}</div>
                  <p className="mt-1 text-sm text-slate-700 line-clamp-2">{review.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-rose-200 bg-white shadow-card p-5">
          <h2 className="text-sm font-semibold text-rose-900">Negative review alerts</h2>
          <p className="text-xs text-rose-700">1–2 star reviews currently visible.</p>
          {negatives.length === 0 ? (
            <div className="mt-3 text-xs text-slate-500">No negative reviews right now.</div>
          ) : (
            <ul className="mt-3 divide-y divide-rose-100">
              {negatives.slice(0, 6).map(({ review, storeName, storeId }) => (
                <li key={`${storeId}-${review.id}`} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {review.authorName}
                    </div>
                    <div className="flex items-center gap-2">
                      <RatingStars rating={review.rating} />
                      <SentimentBadge sentiment={review.sentiment} />
                      <StatusBadge status={review.status} />
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{storeName}</div>
                  <p className="mt-1 text-sm text-slate-700 line-clamp-2">{review.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
