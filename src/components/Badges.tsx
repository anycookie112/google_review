import type { ReviewStatus, Sentiment } from "@/types";

const SENTIMENT_STYLES: Record<Sentiment, string> = {
  positive: "bg-emerald-100 text-emerald-800",
  neutral: "bg-slate-100 text-slate-700",
  negative: "bg-rose-100 text-rose-800",
};

const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SENTIMENT_STYLES[sentiment]}`}
    >
      {SENTIMENT_LABELS[sentiment]}
    </span>
  );
}

const STATUS_STYLES: Record<ReviewStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  needs_reply: "bg-rose-100 text-rose-800",
  replied: "bg-emerald-100 text-emerald-800",
  archived: "bg-slate-100 text-slate-600",
};

const STATUS_LABELS: Record<ReviewStatus, string> = {
  new: "New",
  needs_reply: "Needs reply",
  replied: "Replied",
  archived: "Archived",
};

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
