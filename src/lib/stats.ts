import type { Review, StoreWithReviews } from "@/types";

export interface AggregateStats {
  totalStores: number;
  averageRating: number | null;
  totalPublicReviewCount: number;
  visibleNegativeCount: number;
  needsReplyCount: number;
  visibleReviewCount: number;
}

export function aggregate(data: StoreWithReviews[]): AggregateStats {
  const totalStores = data.length;
  const ratedStores = data.filter((s) => typeof s.rating === "number");
  const averageRating = ratedStores.length
    ? round1(
        ratedStores.reduce((sum, s) => sum + (s.rating ?? 0), 0) / ratedStores.length,
      )
    : null;
  const totalPublicReviewCount = data.reduce(
    (sum, s) => sum + (s.totalReviewCount ?? 0),
    0,
  );

  let visibleNegativeCount = 0;
  let needsReplyCount = 0;
  let visibleReviewCount = 0;
  for (const store of data) {
    for (const r of store.reviews) {
      visibleReviewCount++;
      if (r.sentiment === "negative") visibleNegativeCount++;
      if (r.status === "needs_reply") needsReplyCount++;
    }
  }

  return {
    totalStores,
    averageRating,
    totalPublicReviewCount,
    visibleNegativeCount,
    needsReplyCount,
    visibleReviewCount,
  };
}

export interface VisibleReview {
  storeId: string;
  storeName: string;
  googleMapsUrl: string;
  review: Review;
}

export function flattenReviews(data: StoreWithReviews[]): VisibleReview[] {
  const out: VisibleReview[] = [];
  for (const store of data) {
    for (const review of store.reviews) {
      out.push({
        storeId: store.storeId,
        storeName: store.storeName,
        googleMapsUrl: store.googleMapsUrl,
        review,
      });
    }
  }
  return out;
}

export function sortRecent(reviews: VisibleReview[]): VisibleReview[] {
  return [...reviews].sort((a, b) => {
    const at = a.review.publishTime ? Date.parse(a.review.publishTime) : 0;
    const bt = b.review.publishTime ? Date.parse(b.review.publishTime) : 0;
    return bt - at;
  });
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
