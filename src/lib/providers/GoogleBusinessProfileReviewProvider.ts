import type { Review, ReviewsApiError, StoreConfig, StoreWithReviews } from "@/types";
import { buildSuggestedReply, deriveSentiment } from "@/lib/demoLogic";
import { getGoogleOAuthConnection } from "@/lib/db/googleConnection";
import { getUsableGoogleAccessToken } from "@/lib/google/connection";
import {
  listGoogleBusinessAccounts,
  listGoogleLocationsForAccount,
  listGoogleReviewsForLocation,
  type GoogleBusinessAccount,
  type GoogleBusinessLocation,
  type GoogleBusinessReview,
} from "@/lib/google/oauth";
import type { ReviewProvider } from "./ReviewProvider";

interface ResolvedLocation extends GoogleBusinessLocation {
  account: GoogleBusinessAccount;
  reviewParent: string;
}

type FetchOutcome =
  | { kind: "ok"; value: StoreWithReviews }
  | { kind: "error"; store: StoreConfig; message: string };

export class GoogleBusinessProfileReviewProvider implements ReviewProvider {
  readonly name = "google-business-profile";

  async getStoresWithReviews(stores: StoreConfig[]) {
    if (stores.length === 0) {
      return { data: [], errors: [] };
    }

    const connection = await getGoogleOAuthConnection();
    if (!connection) {
      throw new Error(
        "Google Business Profile is not connected yet. Sign in as an admin and connect Google from /admin/google.",
      );
    }

    const accessToken = await getUsableGoogleAccessToken(connection);
    const accounts = await listGoogleBusinessAccounts(accessToken);
    const locations = await listResolvedLocations(accounts, accessToken);

    const results = await Promise.all(
      stores.map((store) =>
        this.fetchOne(store, accessToken, locations).catch((error): FetchOutcome => ({
          kind: "error",
          store,
          message: error instanceof Error ? error.message : String(error),
        })),
      ),
    );

    const data: StoreWithReviews[] = [];
    const errors: ReviewsApiError[] = [];

    for (const result of results) {
      if (result.kind === "ok") {
        data.push(result.value);
      } else {
        errors.push({
          storeId: result.store.id,
          storeName: result.store.displayName,
          message: result.message,
        });
      }
    }

    return { data, errors };
  }

  private async fetchOne(
    store: StoreConfig,
    accessToken: string,
    locations: ResolvedLocation[],
  ): Promise<FetchOutcome> {
    const location = findMatchingLocation(store, locations);
    if (!location) {
      return {
        kind: "error",
        store,
        message:
          "No matching Business Profile location was found. Match by place ID, or store the GBP account/location resource names for this store.",
      };
    }

    const reviewData = await listGoogleReviewsForLocation(location.reviewParent, accessToken);

    return {
      kind: "ok",
      value: normalizeStore(store, location, reviewData.reviews, reviewData.averageRating, reviewData.totalReviewCount),
    };
  }
}

async function listResolvedLocations(
  accounts: GoogleBusinessAccount[],
  accessToken: string,
): Promise<ResolvedLocation[]> {
  const results = await Promise.all(
    accounts.map(async (account) => {
      const locations = await listGoogleLocationsForAccount(account.name, accessToken);
      return locations.map((location) => ({
        ...location,
        account,
        reviewParent: `${account.name}/${location.name}`,
      }));
    }),
  );

  return results.flat();
}

function findMatchingLocation(
  store: StoreConfig,
  locations: ResolvedLocation[],
): ResolvedLocation | null {
  const exactResourceMatch = locations.find((location) => {
    const storeLocationName = store.googleLocationName?.trim();
    const storeAccountName = store.googleAccountResourceName?.trim();
    if (!storeLocationName) {
      return false;
    }

    const locationNames = new Set([
      location.name,
      location.reviewParent,
      `${location.account.name}/${location.name}`,
    ]);

    if (storeAccountName) {
      return (
        storeAccountName === location.account.name &&
        locationNames.has(storeLocationName)
      );
    }

    return locationNames.has(storeLocationName);
  });

  if (exactResourceMatch) {
    return exactResourceMatch;
  }

  const placeId = store.googlePlaceId?.trim();
  if (placeId) {
    const placeMatch = locations.find(
      (location) => location.metadata.placeId?.trim() === placeId,
    );
    if (placeMatch) {
      return placeMatch;
    }
  }

  const normalizedTitle = normalizeText(store.displayName);
  const titleMatches = locations.filter(
    (location) => normalizeText(location.title) === normalizedTitle,
  );

  if (titleMatches.length === 1) {
    return titleMatches[0];
  }

  const cityAndTitleMatches = titleMatches.filter((location) =>
    normalizeAddress(location.storefrontAddress).includes(normalizeText(store.city)),
  );

  if (cityAndTitleMatches.length === 1) {
    return cityAndTitleMatches[0];
  }

  return null;
}

function normalizeStore(
  store: StoreConfig,
  location: ResolvedLocation,
  rawReviews: GoogleBusinessReview[],
  averageRating: number | null,
  totalReviewCount: number | null,
): StoreWithReviews {
  const reviews: Review[] = rawReviews.map((review) => {
    const rating = mapStarRating(review.starRating);
    const text = review.comment?.trim() ?? "";
    const authorName =
      review.reviewer?.displayName?.trim() ||
      (review.reviewer?.isAnonymous ? "Anonymous" : "Google reviewer");
    const suggestedReply =
      review.reviewReply?.comment?.trim() ||
      buildSuggestedReply({
        authorName,
        rating,
        city: store.city,
        storeName: store.displayName,
      });

    return {
      id: review.reviewId || review.name,
      authorName,
      authorPhotoUrl: review.reviewer?.profilePhotoUrl,
      rating,
      text,
      relativeTimeDescription: formatRelativeTime(review.createTime),
      publishTime: review.createTime,
      sentiment: deriveSentiment(rating, text),
      status: review.reviewReply?.comment
        ? "replied"
        : rating <= 3
          ? "needs_reply"
          : "new",
      suggestedReply,
      replyComment: review.reviewReply?.comment?.trim() ?? null,
      replyUpdatedAt: review.reviewReply?.updateTime ?? null,
      sourceUpdatedAt: review.updateTime,
    };
  });

  return {
    storeId: store.id,
    storeName: store.displayName,
    city: store.city,
    region: store.region,
    managerName: store.managerName,
    placeId: location.metadata.placeId || store.googlePlaceId,
    address: formatPostalAddress(location.storefrontAddress),
    googleMapsUrl: location.metadata.mapsUri || "",
    rating: averageRating,
    totalReviewCount,
    reviews,
  };
}

function mapStarRating(starRating: string | null | undefined): number {
  switch (starRating) {
    case "ONE":
      return 1;
    case "TWO":
      return 2;
    case "THREE":
      return 3;
    case "FOUR":
      return 4;
    case "FIVE":
      return 5;
    default:
      return 0;
  }
}

function formatPostalAddress(
  address:
    | {
        addressLines?: string[];
        locality?: string;
        administrativeArea?: string;
        postalCode?: string;
        regionCode?: string;
      }
    | null
    | undefined,
): string {
  if (!address) {
    return "";
  }

  const parts = [
    ...(address.addressLines ?? []),
    address.locality,
    address.administrativeArea,
    address.postalCode,
    address.regionCode,
  ]
    .map((value) => value?.trim())
    .filter(Boolean);

  return Array.from(new Set(parts)).join(", ");
}

function normalizeAddress(
  address:
    | {
        addressLines?: string[];
        locality?: string;
        administrativeArea?: string;
        postalCode?: string;
        regionCode?: string;
      }
    | null
    | undefined,
): string {
  return normalizeText(formatPostalAddress(address));
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatRelativeTime(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return undefined;
  }

  const diffMs = timestamp - Date.now();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMs) < hour) {
    return rtf.format(Math.round(diffMs / minute), "minute");
  }
  if (Math.abs(diffMs) < day) {
    return rtf.format(Math.round(diffMs / hour), "hour");
  }
  if (Math.abs(diffMs) < week) {
    return rtf.format(Math.round(diffMs / day), "day");
  }
  if (Math.abs(diffMs) < month) {
    return rtf.format(Math.round(diffMs / week), "week");
  }
  if (Math.abs(diffMs) < year) {
    return rtf.format(Math.round(diffMs / month), "month");
  }
  return rtf.format(Math.round(diffMs / year), "year");
}
