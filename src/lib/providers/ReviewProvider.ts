import type { StoreConfig } from "@data/stores";
import type { ReviewsApiError, StoreWithReviews } from "@/types";

/**
 * Provider abstraction. Any source of review data (Google Places, Google
 * Business Profile, a mock, a CSV import, etc.) should implement this
 * interface so the dashboard layer never knows where the data came from.
 */
export interface ReviewProvider {
  readonly name: string;
  getStoresWithReviews(stores: StoreConfig[]): Promise<{
    data: StoreWithReviews[];
    errors: ReviewsApiError[];
  }>;
}
