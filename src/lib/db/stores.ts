import "server-only";

import type { QueryResultRow } from "pg";
import type { ProviderMode, ReviewSyncStatus, StoreConfig } from "@/types";
import { dbQuery } from "./index";

export interface StoreUpsertInput {
  slug: string;
  displayName: string;
  city: string;
  region: string;
  managerName: string;
  googlePlaceId: string;
  googleLocationName?: string | null;
  googleAccountResourceName?: string | null;
  isActive: boolean;
  notes?: string | null;
}

interface StoreRow extends QueryResultRow {
  id: number;
  slug: string;
  display_name: string;
  city: string;
  region: string;
  manager_name: string;
  google_place_id: string;
  google_location_name: string | null;
  google_account_resource_name: string | null;
  is_active: boolean;
  address: string;
  google_maps_url: string;
  notes: string | null;
  public_rating: string | number | null;
  public_review_count: number | null;
  last_review_sync_at: string | Date | null;
  last_review_sync_status: ReviewSyncStatus | null;
  last_review_sync_error: string | null;
  last_review_source_mode: ProviderMode | null;
}

function toIsoString(value: string | Date | null): string | null {
  if (value == null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function toNumber(value: string | number | null): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapStore(row: StoreRow): StoreConfig {
  return {
    dbId: row.id,
    id: row.slug,
    displayName: row.display_name,
    city: row.city,
    region: row.region,
    managerName: row.manager_name,
    googlePlaceId: row.google_place_id,
    googleLocationName: row.google_location_name,
    googleAccountResourceName: row.google_account_resource_name,
    isActive: row.is_active,
    address: row.address,
    googleMapsUrl: row.google_maps_url,
    publicRating: toNumber(row.public_rating),
    publicReviewCount: row.public_review_count,
    notes: row.notes,
    lastReviewSyncAt: toIsoString(row.last_review_sync_at),
    lastReviewSyncStatus: row.last_review_sync_status,
    lastReviewSyncError: row.last_review_sync_error,
    lastReviewSourceMode: row.last_review_source_mode,
  };
}

const STORE_SELECT = `
  select
    id,
    slug,
    display_name,
    city,
    region,
    manager_name,
    google_place_id,
    google_location_name,
    google_account_resource_name,
    is_active,
    address,
    google_maps_url,
    notes,
    public_rating,
    public_review_count,
    last_review_sync_at,
    last_review_sync_status,
    last_review_sync_error,
    last_review_source_mode
  from stores
`;

export async function listActiveStores(): Promise<StoreConfig[]> {
  const result = await dbQuery<StoreRow>(
    `
      ${STORE_SELECT}
      where is_active = true
      order by display_name asc
    `,
  );

  return result.rows.map(mapStore);
}

export async function listAllStores(): Promise<StoreConfig[]> {
  const result = await dbQuery<StoreRow>(
    `
      ${STORE_SELECT}
      order by is_active desc, display_name asc
    `,
  );

  return result.rows.map(mapStore);
}

export async function getStoreBySlug(slug: string): Promise<StoreConfig | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  const result = await dbQuery<StoreRow>(
    `
      ${STORE_SELECT}
      where lower(slug) = lower($1)
      limit 1
    `,
    [normalizedSlug],
  );

  const row = result.rows[0];
  return row ? mapStore(row) : null;
}

export async function createStore(input: StoreUpsertInput): Promise<void> {
  await dbQuery(
    `
      insert into stores (
        slug,
        display_name,
        city,
        region,
        manager_name,
        google_place_id,
        google_location_name,
        google_account_resource_name,
        is_active,
        notes,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
    `,
    [
      normalizeSlug(input.slug),
      normalizeRequiredText(input.displayName),
      normalizeRequiredText(input.city),
      normalizeRequiredText(input.region),
      normalizeRequiredText(input.managerName),
      input.googlePlaceId.trim(),
      normalizeOptionalText(input.googleLocationName),
      normalizeOptionalText(input.googleAccountResourceName),
      input.isActive,
      normalizeOptionalText(input.notes),
    ],
  );
}

export async function updateStore(
  currentSlug: string,
  input: StoreUpsertInput,
): Promise<boolean> {
  const result = await dbQuery(
    `
      update stores
      set slug = $2,
          display_name = $3,
          city = $4,
          region = $5,
          manager_name = $6,
          google_place_id = $7,
          google_location_name = $8,
          google_account_resource_name = $9,
          is_active = $10,
          notes = $11,
          updated_at = now()
      where lower(slug) = lower($1)
    `,
    [
      currentSlug.trim().toLowerCase(),
      normalizeSlug(input.slug),
      normalizeRequiredText(input.displayName),
      normalizeRequiredText(input.city),
      normalizeRequiredText(input.region),
      normalizeRequiredText(input.managerName),
      input.googlePlaceId.trim(),
      normalizeOptionalText(input.googleLocationName),
      normalizeOptionalText(input.googleAccountResourceName),
      input.isActive,
      normalizeOptionalText(input.notes),
    ],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function countStores(): Promise<number> {
  const result = await dbQuery<{ count: string }>(
    `
      select count(*)::text as count
      from stores
    `,
  );

  return Number(result.rows[0]?.count ?? "0");
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeRequiredText(value: string): string {
  return value.trim();
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
