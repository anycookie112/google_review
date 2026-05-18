export type Sentiment = "positive" | "neutral" | "negative";

export type ReviewStatus = "new" | "needs_reply" | "replied" | "archived";

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
  reviews: Review[];
}

export interface ReviewsApiError {
  storeId: string;
  storeName: string;
  message: string;
}

export type ProviderMode = "places" | "mock";

export interface ReviewsApiResponse {
  mode: ProviderMode;
  data: StoreWithReviews[];
  errors: ReviewsApiError[];
}
