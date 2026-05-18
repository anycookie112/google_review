import type { ProviderMode } from "@/types";
import { GooglePlacesReviewProvider } from "./GooglePlacesReviewProvider";
import { MockReviewProvider } from "./MockReviewProvider";
import type { ReviewProvider } from "./ReviewProvider";

export interface ResolvedProvider {
  provider: ReviewProvider;
  mode: ProviderMode;
}

/**
 * Pick a provider based on environment configuration.
 *  - If GOOGLE_MAPS_API_KEY is set → use Google Places.
 *  - Otherwise → fall back to mock data so the UI is always demoable.
 *
 * To swap in the Google Business Profile API later:
 *  1. Implement a new class (e.g. BusinessProfileReviewProvider) that satisfies
 *     the ReviewProvider interface in ./ReviewProvider.ts.
 *  2. Update this function to pick it when the relevant credentials are present
 *     (typically a service-account JSON path / OAuth client config).
 *  3. The /api/places/reviews route and the entire frontend keep working
 *     unchanged — that's the whole point of the abstraction.
 */
export function resolveProvider(): ResolvedProvider {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (apiKey) {
    return { provider: new GooglePlacesReviewProvider(apiKey), mode: "places" };
  }
  return { provider: new MockReviewProvider(), mode: "mock" };
}

export type { ReviewProvider } from "./ReviewProvider";
export { GooglePlacesReviewProvider } from "./GooglePlacesReviewProvider";
export { MockReviewProvider } from "./MockReviewProvider";
