import type { Review, ReviewsApiError, StoreConfig, StoreWithReviews } from "@/types";
import { buildSuggestedReply, deriveSentiment, deriveStatus } from "@/lib/demoLogic";
import type { ReviewProvider } from "./ReviewProvider";

/**
 * Reads public place data (rating, total review count, up to ~5 review samples)
 * from the Places API (New).
 *
 * Endpoint: GET https://places.googleapis.com/v1/places/{placeId}
 * Auth:     X-Goog-Api-Key header (server-side only)
 * Fields:   selected via X-Goog-FieldMask header
 *
 * Known limitations (these are why we'll move to Business Profile API later):
 *  - Only a small sample of reviews is returned (typically up to 5).
 *  - No reply / reply state is returned.
 *  - No way to post a reply.
 *  - No historical review data.
 */
export class GooglePlacesReviewProvider implements ReviewProvider {
  readonly name = "google-places";

  private static readonly ENDPOINT = "https://places.googleapis.com/v1/places";
  private static readonly FIELD_MASK = [
    "id",
    "displayName",
    "formattedAddress",
    "rating",
    "userRatingCount",
    "reviews",
    "googleMapsUri",
  ].join(",");

  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new Error("GooglePlacesReviewProvider requires a non-empty API key.");
    }
  }

  async getStoresWithReviews(stores: StoreConfig[]) {
    const results = await Promise.all(
      stores.map((store) => this.fetchOne(store).catch((err): FetchOutcome => ({
        kind: "error",
        store,
        message: err instanceof Error ? err.message : String(err),
      }))),
    );

    const data: StoreWithReviews[] = [];
    const errors: ReviewsApiError[] = [];

    for (const result of results) {
      if (result.kind === "ok") data.push(result.value);
      else errors.push({
        storeId: result.store.id,
        storeName: result.store.displayName,
        message: result.message,
      });
    }

    return { data, errors };
  }

  private async fetchOne(store: StoreConfig): Promise<FetchOutcome> {
    if (!store.googlePlaceId || store.googlePlaceId.startsWith("REPLACE_WITH_")) {
      return {
        kind: "error",
        store,
        message: "Place ID is not configured for this store in the database.",
      };
    }

    const url = `${GooglePlacesReviewProvider.ENDPOINT}/${encodeURIComponent(store.googlePlaceId)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": GooglePlacesReviewProvider.FIELD_MASK,
      },
      // Don't cache between dashboard refreshes — review data is the whole point.
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await safeText(res);
      return {
        kind: "error",
        store,
        message: `Places API responded ${res.status}: ${body || res.statusText}`,
      };
    }

    const json = (await res.json()) as PlacesApiPlace;
    return { kind: "ok", value: normalize(store, json) };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type FetchOutcome =
  | { kind: "ok"; value: StoreWithReviews }
  | { kind: "error"; store: StoreConfig; message: string };

interface PlacesApiPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: PlacesApiReview[];
}

interface PlacesApiReview {
  name?: string;
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  authorAttribution?: {
    displayName?: string;
    photoUri?: string;
  };
  relativePublishTimeDescription?: string;
  publishTime?: string;
}

function normalize(store: StoreConfig, place: PlacesApiPlace): StoreWithReviews {
  const reviews: Review[] = (place.reviews ?? []).map((raw, idx) => {
    const rating = typeof raw.rating === "number" ? raw.rating : 0;
    const text = raw.text?.text ?? raw.originalText?.text ?? "";
    const id = raw.name ?? `${place.id ?? store.googlePlaceId}-review-${idx}`;
    const authorName = raw.authorAttribution?.displayName ?? "Anonymous";

    return {
      id,
      authorName,
      authorPhotoUrl: raw.authorAttribution?.photoUri,
      rating,
      text,
      relativeTimeDescription: raw.relativePublishTimeDescription,
      publishTime: raw.publishTime,
      sentiment: deriveSentiment(rating, text),
      status: deriveStatus(id, rating),
      suggestedReply: buildSuggestedReply({
        authorName,
        rating,
        city: store.city,
        storeName: store.displayName,
      }),
    };
  });

  return {
    storeId: store.id,
    storeName: store.displayName,
    city: store.city,
    region: store.region,
    managerName: store.managerName,
    placeId: place.id ?? store.googlePlaceId,
    address: place.formattedAddress ?? "",
    googleMapsUrl: place.googleMapsUri ?? "",
    rating: place.rating ?? null,
    totalReviewCount: place.userRatingCount ?? null,
    reviews,
  };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
