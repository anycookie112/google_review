// SERVER-ONLY: do not import this file from a client component. It reads
// GOOGLE_MAPS_API_KEY from process.env and would leak it into the browser
// bundle. Client components must call /api/places/reviews instead.
import { stores } from "@data/stores";
import { resolveProvider } from "@/lib/providers";
import type { ReviewsApiResponse } from "@/types";

/**
 * Shared loader used by:
 *  - The /api/places/reviews route handler (returns this verbatim as JSON).
 *  - RSC pages that need the same payload (skips the HTTP round-trip).
 *
 * Frontend client components still go through /api/places/reviews — they
 * MUST NOT import this file, since it would leak server-only code to the bundle.
 */
export async function loadReviewsPayload(): Promise<ReviewsApiResponse> {
  const { provider, mode } = resolveProvider();
  try {
    const { data, errors } = await provider.getStoresWithReviews(stores);
    return { mode, data, errors };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      mode,
      data: [],
      errors: [{ storeId: "_global", storeName: "All stores", message }],
    };
  }
}
