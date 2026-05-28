import Link from "next/link";
import { notFound } from "next/navigation";
import { loadReviewsPayload } from "@/lib/loadReviews";
import { ModeBadge } from "@/components/ModeBadge";
import { DemoBanner } from "@/components/DemoBanner";
import { StatCard } from "@/components/StatCard";
import { ReviewCard } from "@/components/ReviewCard";
import { EmptyState } from "@/components/States";

export const dynamic = "force-dynamic";

export default async function StoreDetailPage({
  params,
}: {
  params: { storeId: string };
}) {
  const { mode, data } = await loadReviewsPayload();
  const store = data.find((s) => s.storeId === params.storeId);
  if (!store) notFound();

  const totals = {
    positive: store.reviews.filter((r) => r.sentiment === "positive").length,
    neutral: store.reviews.filter((r) => r.sentiment === "neutral").length,
    negative: store.reviews.filter((r) => r.sentiment === "negative").length,
  };
  const total = store.reviews.length;
  const negatives = store.reviews.filter((r) => r.sentiment === "negative");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/dashboard" className="text-xs text-brand-600 hover:underline">
          ← Back to dashboard
        </Link>
        <ModeBadge mode={mode} />
      </div>

      <header className="rounded-lg border border-slate-200 bg-white shadow-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{store.storeName}</h1>
            <div className="mt-1 text-sm text-slate-600">{store.address || "—"}</div>
            <div className="mt-1 text-xs text-slate-500">
              {store.city} · {store.region} · Manager: {store.managerName}
            </div>
          </div>
          {store.googleMapsUrl ? (
            <a
              href={store.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-brand-600 hover:underline"
            >
              Open in Google Maps ↗
            </a>
          ) : null}
        </div>
      </header>

      {mode === "places" ? <DemoBanner /> : null}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Rating"
          value={store.rating == null ? "—" : store.rating.toFixed(1)}
        />
        <StatCard
          label="Public reviews"
          value={store.totalReviewCount?.toLocaleString() ?? "—"}
        />
        <StatCard
          label="Visible reviews"
          value={total}
          hint={mode === "business_profile" ? "Returned from Business Profile" : "From Places API sample"}
        />
        <StatCard
          label="Negative visible"
          value={totals.negative}
          tone={totals.negative > 0 ? "negative" : "default"}
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-card p-5">
        <h2 className="text-sm font-semibold text-slate-900">Sentiment breakdown</h2>
        <p className="text-xs text-slate-500">
          Based on the {total} review{total === 1 ? "" : "s"} visible right now.
        </p>
        <SentimentBars totals={totals} />
      </section>

      {negatives.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-rose-900">Recent negative reviews</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {negatives.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                storeName={store.storeName}
                googleMapsUrl={store.googleMapsUrl}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">All visible reviews</h2>
        {store.reviews.length === 0 ? (
          <EmptyState
            title="No reviews returned"
            hint={
              mode === "business_profile"
                ? "No reviews were returned for this Business Profile location."
                : "The Places API did not return any review samples for this place."
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {store.reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                storeName={store.storeName}
                googleMapsUrl={store.googleMapsUrl}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SentimentBars({
  totals,
}: {
  totals: { positive: number; neutral: number; negative: number };
}) {
  const total = totals.positive + totals.neutral + totals.negative;
  if (total === 0) {
    return <div className="mt-3 text-xs text-slate-500">No reviews to summarize.</div>;
  }
  const pct = (n: number) => Math.round((n / total) * 100);
  return (
    <div className="mt-4 space-y-3">
      <Bar label="Positive" count={totals.positive} pct={pct(totals.positive)} color="bg-emerald-500" />
      <Bar label="Neutral" count={totals.neutral} pct={pct(totals.neutral)} color="bg-slate-400" />
      <Bar label="Negative" count={totals.negative} pct={pct(totals.negative)} color="bg-rose-500" />
    </div>
  );
}

function Bar({
  label,
  count,
  pct,
  color,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span>
          {count} ({pct}%)
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// We can't statically generate params here because store data depends on the
// runtime payload. RSC + dynamic = "force-dynamic" handles routing at request
// time, so a 404 falls through if storeId doesn't match.

// Provide a basic not-found page hook.
export function generateMetadata({
  params,
}: {
  params: { storeId: string };
}) {
  return { title: `Store ${params.storeId} — Reviews Monitor` };
}
