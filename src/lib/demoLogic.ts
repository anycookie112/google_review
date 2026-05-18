// =============================================================================
// DEMO-ONLY LOGIC
// -----------------------------------------------------------------------------
// Google Places API does not return reply status, reply history, or a sentiment
// label. For the proof-of-concept demo we derive all of these locally from the
// rating and text. When the app is later wired to the Google Business Profile
// API, replace these helpers with the real values returned by that API.
// =============================================================================

import type { ReviewStatus, Sentiment } from "@/types";

export function deriveSentiment(rating: number, _text: string): Sentiment {
  // DEMO: Sentiment is derived purely from the star rating. A production
  // implementation should run NLP on the review text (e.g. Vertex AI, an LLM,
  // or a hosted sentiment model) for a more accurate signal.
  if (rating <= 2) return "negative";
  if (rating === 3) return "neutral";
  return "positive";
}

export function deriveStatus(reviewId: string, rating: number): ReviewStatus {
  // DEMO: Places API doesn't expose reply state. We fake it deterministically
  // so the same review always gets the same status across requests.
  if (rating <= 2) return "needs_reply";
  if (rating === 3) return "new";
  return hashString(reviewId) % 2 === 0 ? "replied" : "archived";
}

export function buildSuggestedReply(opts: {
  authorName: string;
  rating: number;
  city: string;
  storeName: string;
}): string {
  // DEMO: Template-based reply generator. Swap in an LLM call for production.
  const firstName = (opts.authorName || "there").split(" ")[0] || "there";

  if (opts.rating <= 2) {
    return (
      `Hi ${firstName}, we're truly sorry your visit to ${opts.storeName} fell short ` +
      `of what we aim for. Your feedback matters and we'd like the chance to make this ` +
      `right — please reach out to our ${opts.city} store manager directly so we can ` +
      `look into what happened. Thank you for letting us know.`
    );
  }

  if (opts.rating === 3) {
    return (
      `Hi ${firstName}, thank you for taking the time to share an honest review. ` +
      `We're glad parts of your visit went well, and we'd love to hear what we ` +
      `could do better next time. If you have a moment, please let our ${opts.city} ` +
      `team know — we read every note.`
    );
  }

  return (
    `Hi ${firstName}, thank you so much for the kind words! We're delighted you ` +
    `enjoyed your visit to ${opts.storeName} and we'll be sure to share this with ` +
    `the team. We hope to welcome you back to our ${opts.city} branch very soon.`
  );
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
