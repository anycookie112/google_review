export type Sentiment = "positive" | "neutral" | "negative";

export type ReviewStatus = "new" | "needs_reply" | "replied" | "archived";
export type AppUserRole = "admin" | "member";
export type ReviewSyncStatus = "never" | "running" | "success" | "failed" | "partial";
export type SyncTriggerType = "manual" | "scheduled" | "system";
export type AppUserStatus =
  | "pending_approval"
  | "approved_setup_pending"
  | "active"
  | "rejected";

export type ProviderMode = "business_profile" | "places" | "mock";

export interface StoreConfig {
  dbId?: number;
  id: string;
  displayName: string;
  city: string;
  region: string;
  managerName: string;
  googlePlaceId: string;
  googleLocationName?: string | null;
  googleAccountResourceName?: string | null;
  isActive?: boolean;
  address?: string;
  googleMapsUrl?: string;
  publicRating?: number | null;
  publicReviewCount?: number | null;
  notes?: string | null;
  lastReviewSyncAt?: string | null;
  lastReviewSyncStatus?: ReviewSyncStatus | null;
  lastReviewSyncError?: string | null;
  lastReviewSourceMode?: ProviderMode | null;
}

export interface Review {
  id: string;
  authorName: string;
  authorPhotoUrl?: string;
  rating: number;
  text: string;
  relativeTimeDescription?: string;
  publishTime?: string;
  sentiment: Sentiment;
  status: ReviewStatus;
  suggestedReply: string;
  replyComment?: string | null;
  replyUpdatedAt?: string | null;
  sourceUpdatedAt?: string | null;
  lastSeenAt?: string | null;
}

export interface StoreWithReviews {
  storeId: string;
  storeName: string;
  city: string;
  region: string;
  managerName: string;
  placeId: string;
  address: string;
  googleMapsUrl: string;
  rating: number | null;
  totalReviewCount: number | null;
  lastReviewSyncAt?: string | null;
  lastReviewSyncStatus?: ReviewSyncStatus | null;
  sourceMode?: ProviderMode | null;
  reviews: Review[];
}

export interface ReviewsApiError {
  storeId: string;
  storeName: string;
  message: string;
}

export interface ReviewsApiResponse {
  mode: ProviderMode;
  data: StoreWithReviews[];
  errors: ReviewsApiError[];
}
