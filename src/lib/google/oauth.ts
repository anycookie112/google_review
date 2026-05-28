import "server-only";

import { getGoogleOauthConfig } from "./config";

const GOOGLE_AUTH_BASE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_BUSINESS_ACCOUNTS_URL =
  "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";

export interface GoogleTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scope: string;
  idToken: string | null;
}

export interface GoogleUserProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleBusinessAccount {
  name: string;
  accountName: string;
  type: string;
  role: string | null;
}

export interface GoogleBusinessLocation {
  name: string;
  title: string;
  storeCode: string | null;
  storefrontAddress: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
  } | null;
  metadata: {
    placeId: string | null;
    mapsUri: string | null;
    newReviewUri: string | null;
  };
  openInfo: {
    status: string | null;
  } | null;
}

export interface GoogleBusinessReview {
  name: string;
  reviewId: string;
  reviewer: {
    profilePhotoUrl?: string;
    displayName?: string;
    isAnonymous?: boolean;
  } | null;
  starRating: string | null;
  comment: string;
  createTime: string;
  updateTime: string;
  reviewReply: {
    comment: string;
    updateTime?: string;
  } | null;
}

export function buildGoogleAuthorizationUrl(state: string): string {
  const config = getGoogleOauthConfig();
  const url = new URL(GOOGLE_AUTH_BASE_URL);

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeGoogleCodeForTokens(
  code: string,
): Promise<GoogleTokenResponse> {
  const config = getGoogleOauthConfig();

  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });

  return requestTokens(body);
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<GoogleTokenResponse> {
  const config = getGoogleOauthConfig();

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  return requestTokens(body);
}

export async function fetchGoogleUserProfile(
  accessToken: string,
): Promise<GoogleUserProfile> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google user info failed: ${await response.text()}`);
  }

  const payload = (await response.json()) as Partial<GoogleUserProfile>;
  if (!payload.sub || !payload.email || !payload.name) {
    throw new Error("Google user info response was missing required fields.");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

export async function listGoogleBusinessAccounts(
  accessToken: string,
): Promise<GoogleBusinessAccount[]> {
  const accounts: GoogleBusinessAccount[] = [];
  let pageToken = "";

  do {
    const url = new URL(GOOGLE_BUSINESS_ACCOUNTS_URL);
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Business accounts lookup failed: ${await response.text()}`);
    }

    const payload = (await response.json()) as {
      accounts?: Array<{
        name?: string;
        accountName?: string;
        type?: string;
        role?: string;
      }>;
      nextPageToken?: string;
    };

    for (const account of payload.accounts ?? []) {
      accounts.push({
        name: account.name ?? "unknown",
        accountName: account.accountName ?? account.name ?? "Unnamed account",
        type: account.type ?? "UNKNOWN",
        role: account.role ?? null,
      });
    }

    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);

  return accounts;
}

export async function listGoogleLocationsForAccount(
  accountName: string,
  accessToken: string,
): Promise<GoogleBusinessLocation[]> {
  const locations: GoogleBusinessLocation[] = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
    );
    url.searchParams.set(
      "readMask",
      [
        "name",
        "title",
        "storeCode",
        "storefrontAddress",
        "metadata",
        "openInfo",
      ].join(","),
    );
    url.searchParams.set("pageSize", "100");

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Business locations lookup failed: ${await response.text()}`);
    }

    const payload = (await response.json()) as {
      locations?: Array<{
        name?: string;
        title?: string;
        storeCode?: string;
        storefrontAddress?: GoogleBusinessLocation["storefrontAddress"];
        metadata?: {
          placeId?: string;
          mapsUri?: string;
          newReviewUri?: string;
        };
        openInfo?: {
          status?: string;
        };
      }>;
      nextPageToken?: string;
    };

    for (const location of payload.locations ?? []) {
      if (!location.name || !location.title) {
        continue;
      }

      locations.push({
        name: location.name,
        title: location.title,
        storeCode: location.storeCode ?? null,
        storefrontAddress: location.storefrontAddress ?? null,
        metadata: {
          placeId: location.metadata?.placeId ?? null,
          mapsUri: location.metadata?.mapsUri ?? null,
          newReviewUri: location.metadata?.newReviewUri ?? null,
        },
        openInfo: location.openInfo
          ? { status: location.openInfo.status ?? null }
          : null,
      });
    }

    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);

  return locations;
}

export async function listGoogleReviewsForLocation(
  reviewParent: string,
  accessToken: string,
): Promise<{
  reviews: GoogleBusinessReview[];
  averageRating: number | null;
  totalReviewCount: number | null;
}> {
  const reviews: GoogleBusinessReview[] = [];
  let pageToken = "";
  let averageRating: number | null = null;
  let totalReviewCount: number | null = null;

  do {
    const url = new URL(`https://mybusiness.googleapis.com/v4/${reviewParent}/reviews`);
    url.searchParams.set("pageSize", "50");
    url.searchParams.set("orderBy", "updateTime desc");

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Business reviews lookup failed: ${await response.text()}`);
    }

    const payload = (await response.json()) as {
      reviews?: Array<{
        name?: string;
        reviewId?: string;
        reviewer?: GoogleBusinessReview["reviewer"];
        starRating?: string;
        comment?: string;
        createTime?: string;
        updateTime?: string;
        reviewReply?: GoogleBusinessReview["reviewReply"];
      }>;
      averageRating?: number;
      totalReviewCount?: number;
      nextPageToken?: string;
    };

    if (typeof payload.averageRating === "number") {
      averageRating = payload.averageRating;
    }
    if (typeof payload.totalReviewCount === "number") {
      totalReviewCount = payload.totalReviewCount;
    }

    for (const review of payload.reviews ?? []) {
      if (!review.name || !review.reviewId) {
        continue;
      }

      reviews.push({
        name: review.name,
        reviewId: review.reviewId,
        reviewer: review.reviewer ?? null,
        starRating: review.starRating ?? null,
        comment: review.comment ?? "",
        createTime: review.createTime ?? "",
        updateTime: review.updateTime ?? "",
        reviewReply: review.reviewReply ?? null,
      });
    }

    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);

  return { reviews, averageRating, totalReviewCount };
}

function parseExpiresAt(expiresIn: unknown): string | null {
  if (typeof expiresIn !== "number" && typeof expiresIn !== "string") {
    return null;
  }

  const seconds = Number(expiresIn);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return new Date(Date.now() + seconds * 1000).toISOString();
}

async function requestTokens(body: URLSearchParams): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number | string;
    scope?: string;
    id_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        "Google token exchange failed.",
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: parseExpiresAt(payload.expires_in),
    scope: payload.scope ?? "",
    idToken: payload.id_token ?? null,
  };
}
