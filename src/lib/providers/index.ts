import type { ProviderMode } from "@/types";
import { getGoogleOAuthConnection } from "@/lib/db/googleConnection";
import { GoogleBusinessProfileReviewProvider } from "./GoogleBusinessProfileReviewProvider";
import { GooglePlacesReviewProvider } from "./GooglePlacesReviewProvider";
import { MockReviewProvider } from "./MockReviewProvider";
import type { ReviewProvider } from "./ReviewProvider";

export interface ResolvedProvider {
  provider: ReviewProvider;
  mode: ProviderMode;
}

/**
 * Pick a provider based on environment configuration.
 *  - If an admin connected Google Business Profile → use GBP.
 *  - Else if GOOGLE_MAPS_API_KEY is set → use Google Places as a fallback.
 *  - Otherwise → fall back to mock data so the UI is always demoable.
 */
export async function resolveProvider(): Promise<ResolvedProvider> {
  const googleConnection = await getGoogleOAuthConnection();
  if (googleConnection) {
    return {
      provider: new GoogleBusinessProfileReviewProvider(),
      mode: "business_profile",
    };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (apiKey) {
    return { provider: new GooglePlacesReviewProvider(apiKey), mode: "places" };
  }
  return { provider: new MockReviewProvider(), mode: "mock" };
}

export type { ReviewProvider } from "./ReviewProvider";
export { GoogleBusinessProfileReviewProvider } from "./GoogleBusinessProfileReviewProvider";
export { GooglePlacesReviewProvider } from "./GooglePlacesReviewProvider";
export { MockReviewProvider } from "./MockReviewProvider";
