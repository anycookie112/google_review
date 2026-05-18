"use client";

import { useState } from "react";
import type { Review } from "@/types";
import { RatingStars } from "./RatingStars";
import { SentimentBadge, StatusBadge } from "./Badges";

interface ReviewCardProps {
  review: Review;
  storeName: string;
  googleMapsUrl?: string;
}

export function ReviewCard({ review, storeName, googleMapsUrl }: ReviewCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(review.suggestedReply);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Older browsers without clipboard API — silently no-op for demo.
    }
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white shadow-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500">{storeName}</div>
          <div className="mt-0.5 font-semibold text-slate-900">{review.authorName}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RatingStars rating={review.rating} />
          <SentimentBadge sentiment={review.sentiment} />
          <StatusBadge status={review.status} />
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{review.text}</p>

      {review.relativeTimeDescription ? (
        <div className="mt-2 text-xs text-slate-500">
          {review.relativeTimeDescription}
        </div>
      ) : null}

      <div className="mt-4 rounded-md bg-slate-50 border border-slate-200 p-3">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Suggested reply (demo)
        </div>
        <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">
          {review.suggestedReply}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center rounded-md bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3 py-1.5 transition"
        >
          {copied ? "Copied!" : "Copy suggested reply"}
        </button>
        {googleMapsUrl ? (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-3 py-1.5 transition"
          >
            Open in Google Maps ↗
          </a>
        ) : null}
      </div>
    </article>
  );
}
