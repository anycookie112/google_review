"use client";

import { useMemo, useState } from "react";
import type { ReviewStatus, Sentiment, StoreWithReviews } from "@/types";
import { ReviewCard } from "@/components/ReviewCard";
import { EmptyState } from "@/components/States";
import { flattenReviews, sortRecent } from "@/lib/stats";

const RATING_OPTIONS = [
  { value: "all", label: "Any rating" },
  { value: "5", label: "5 stars" },
  { value: "4", label: "4 stars" },
  { value: "3", label: "3 stars" },
  { value: "2", label: "2 stars" },
  { value: "1", label: "1 star" },
];

const SENTIMENT_OPTIONS: { value: "all" | Sentiment; label: string }[] = [
  { value: "all", label: "Any sentiment" },
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

const STATUS_OPTIONS: { value: "all" | ReviewStatus; label: string }[] = [
  { value: "all", label: "Any status" },
  { value: "new", label: "New" },
  { value: "needs_reply", label: "Needs reply" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
];

export function ReviewsInbox({ data }: { data: StoreWithReviews[] }) {
  const [storeId, setStoreId] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");
  const [rating, setRating] = useState<string>("all");
  const [sentiment, setSentiment] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  const regions = useMemo(
    () => Array.from(new Set(data.map((s) => s.region))).sort(),
    [data],
  );

  const filtered = useMemo(() => {
    const flat = sortRecent(flattenReviews(data));
    const q = query.trim().toLowerCase();
    return flat.filter(({ review, storeId: sid }) => {
      const store = data.find((s) => s.storeId === sid);
      if (storeId !== "all" && sid !== storeId) return false;
      if (region !== "all" && store?.region !== region) return false;
      if (rating !== "all" && review.rating !== Number(rating)) return false;
      if (sentiment !== "all" && review.sentiment !== sentiment) return false;
      if (status !== "all" && review.status !== status) return false;
      if (q) {
        const hay = `${review.authorName} ${review.text}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, storeId, region, rating, sentiment, status, query]);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white shadow-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <Select
            label="Store"
            value={storeId}
            onChange={setStoreId}
            options={[
              { value: "all", label: "All stores" },
              ...data.map((s) => ({ value: s.storeId, label: s.storeName })),
            ]}
          />
          <Select
            label="Region"
            value={region}
            onChange={setRegion}
            options={[
              { value: "all", label: "All regions" },
              ...regions.map((r) => ({ value: r, label: r })),
            ]}
          />
          <Select label="Rating" value={rating} onChange={setRating} options={RATING_OPTIONS} />
          <Select
            label="Sentiment"
            value={sentiment}
            onChange={setSentiment}
            options={SENTIMENT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <Select
            label="Status"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Search
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Reviewer or text…"
              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          Showing {filtered.length} of {flattenReviews(data).length} visible reviews.
        </div>
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          title="No reviews match your filters"
          hint="Try widening the rating, sentiment, or status filter."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(({ review, storeName, storeId: sid, googleMapsUrl }) => (
            <ReviewCard
              key={`${sid}-${review.id}`}
              review={review}
              storeName={storeName}
              googleMapsUrl={googleMapsUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-normal text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
