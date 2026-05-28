import "server-only";

import type { PoolClient, QueryResultRow } from "pg";
import type {
  ProviderMode,
  Review,
  ReviewSyncStatus,
  StoreConfig,
  StoreWithReviews,
  SyncTriggerType,
} from "@/types";
import { dbQuery, dbTransaction } from "./index";
import { listActiveStores, listAllStores } from "./stores";

export interface SyncRunRecord {
  id: number;
  triggerType: SyncTriggerType;
  triggeredByUserId: number | null;
  providerMode: ProviderMode | null;
  status: ReviewSyncStatus;
  storesTotal: number;
  storesSucceeded: number;
  storesFailed: number;
  reviewsUpserted: number;
  summaryMessage: string | null;
  errorJson: unknown;
  startedAt: string;
  finishedAt: string | null;
  updatedAt: string;
}

export interface ReviewStorageStats {
  reviewCount: number;
  syncedStoreCount: number;
  latestSyncAt: string | null;
}

interface SyncRunRow extends QueryResultRow {
  id: number;
  trigger_type: SyncTriggerType;
  triggered_by_user_id: number | null;
  provider_mode: ProviderMode | null;
  status: ReviewSyncStatus;
  stores_total: number;
  stores_succeeded: number;
  stores_failed: number;
  reviews_upserted: number;
  summary_message: string | null;
  error_json: unknown;
  started_at: string | Date;
  finished_at: string | Date | null;
  updated_at: string | Date;
}

interface ReviewRow extends QueryResultRow {
  store_id: number;
  external_review_id: string;
  author_name: string;
  author_photo_url: string | null;
  rating: number;
  text: string;
  relative_time_description: string | null;
  publish_time: string | Date | null;
  source_updated_at: string | Date | null;
  sentiment: Review["sentiment"];
  status: Review["status"];
  suggested_reply: string;
  last_seen_at: string | Date;
  reply_comment: string | null;
  reply_updated_at: string | Date | null;
}

function toIsoString(value: string | Date | null): string | null {
  if (value == null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function mapSyncRun(row: SyncRunRow): SyncRunRecord {
  return {
    id: row.id,
    triggerType: row.trigger_type,
    triggeredByUserId: row.triggered_by_user_id,
    providerMode: row.provider_mode,
    status: row.status,
    storesTotal: row.stores_total,
    storesSucceeded: row.stores_succeeded,
    storesFailed: row.stores_failed,
    reviewsUpserted: row.reviews_upserted,
    summaryMessage: row.summary_message,
    errorJson: row.error_json,
    startedAt: toIsoString(row.started_at) ?? new Date().toISOString(),
    finishedAt: toIsoString(row.finished_at),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
  };
}

export async function hasPersistedReviewData(): Promise<boolean> {
  const result = await dbQuery<{ has_data: boolean }>(
    `
      select exists(
        select 1
        from stores
        where last_review_sync_at is not null
      ) as has_data
    `,
  );

  return Boolean(result.rows[0]?.has_data);
}

export async function listPersistedStoresWithReviews(
  activeOnly = true,
): Promise<StoreWithReviews[]> {
  const stores = activeOnly ? await listActiveStores() : await listAllStores();
  if (stores.length === 0) {
    return [];
  }

  const storeIds = stores
    .map((store) => store.dbId)
    .filter((value): value is number => typeof value === "number");

  if (storeIds.length === 0) {
    return stores.map(mapStoreWithoutReviews);
  }

  const reviewsResult = await dbQuery<ReviewRow>(
    `
      select
        r.store_id,
        r.external_review_id,
        r.author_name,
        r.author_photo_url,
        r.rating,
        r.text,
        r.relative_time_description,
        r.publish_time,
        r.source_updated_at,
        r.sentiment,
        r.status,
        r.suggested_reply,
        r.last_seen_at,
        rr.reply_comment,
        rr.reply_updated_at
      from reviews r
      left join review_replies rr
        on rr.review_id = r.id
      where r.store_id = any($1::bigint[])
      order by r.publish_time desc nulls last, r.id desc
    `,
    [storeIds],
  );

  const reviewsByStoreId = new Map<number, Review[]>();
  for (const row of reviewsResult.rows) {
    const current = reviewsByStoreId.get(row.store_id) ?? [];
    current.push({
      id: row.external_review_id,
      authorName: row.author_name,
      authorPhotoUrl: row.author_photo_url ?? undefined,
      rating: row.rating,
      text: row.text,
      relativeTimeDescription: row.relative_time_description ?? undefined,
      publishTime: toIsoString(row.publish_time) ?? undefined,
      sentiment: row.sentiment,
      status: row.status,
      suggestedReply: row.suggested_reply,
      replyComment: row.reply_comment,
      replyUpdatedAt: toIsoString(row.reply_updated_at),
      sourceUpdatedAt: toIsoString(row.source_updated_at),
      lastSeenAt: toIsoString(row.last_seen_at),
    });
    reviewsByStoreId.set(row.store_id, current);
  }

  return stores.map((store) => ({
    storeId: store.id,
    storeName: store.displayName,
    city: store.city,
    region: store.region,
    managerName: store.managerName,
    placeId: store.googlePlaceId,
    address: store.address ?? "",
    googleMapsUrl: store.googleMapsUrl ?? "",
    rating: store.publicRating ?? null,
    totalReviewCount: store.publicReviewCount ?? null,
    lastReviewSyncAt: store.lastReviewSyncAt ?? null,
    lastReviewSyncStatus: store.lastReviewSyncStatus ?? null,
    sourceMode: store.lastReviewSourceMode ?? null,
    reviews:
      (store.dbId != null ? reviewsByStoreId.get(store.dbId) : undefined) ?? [],
  }));
}

export async function startSyncRun(input: {
  triggerType: SyncTriggerType;
  triggeredByUserId?: number | null;
}): Promise<SyncRunRecord> {
  const result = await dbQuery<SyncRunRow>(
    `
      insert into review_sync_runs (trigger_type, triggered_by_user_id, status)
      values ($1, $2, 'running')
      returning
        id,
        trigger_type,
        triggered_by_user_id,
        provider_mode,
        status,
        stores_total,
        stores_succeeded,
        stores_failed,
        reviews_upserted,
        summary_message,
        error_json,
        started_at,
        finished_at,
        updated_at
    `,
    [input.triggerType, input.triggeredByUserId ?? null],
  );

  return mapSyncRun(result.rows[0]);
}

export async function finishSyncRun(input: {
  runId: number;
  providerMode: ProviderMode;
  status: ReviewSyncStatus;
  storesTotal: number;
  storesSucceeded: number;
  storesFailed: number;
  reviewsUpserted: number;
  summaryMessage?: string | null;
  errorJson?: unknown;
}): Promise<void> {
  await dbQuery(
    `
      update review_sync_runs
      set provider_mode = $2,
          status = $3,
          stores_total = $4,
          stores_succeeded = $5,
          stores_failed = $6,
          reviews_upserted = $7,
          summary_message = $8,
          error_json = $9,
          finished_at = now(),
          updated_at = now()
      where id = $1
    `,
    [
      input.runId,
      input.providerMode,
      input.status,
      input.storesTotal,
      input.storesSucceeded,
      input.storesFailed,
      input.reviewsUpserted,
      input.summaryMessage ?? null,
      input.errorJson ?? null,
    ],
  );
}

export async function listRecentSyncRuns(limit = 10): Promise<SyncRunRecord[]> {
  const result = await dbQuery<SyncRunRow>(
    `
      select
        id,
        trigger_type,
        triggered_by_user_id,
        provider_mode,
        status,
        stores_total,
        stores_succeeded,
        stores_failed,
        reviews_upserted,
        summary_message,
        error_json,
        started_at,
        finished_at,
        updated_at
      from review_sync_runs
      order by started_at desc
      limit $1
    `,
    [limit],
  );

  return result.rows.map(mapSyncRun);
}

export async function getLatestSyncRun(): Promise<SyncRunRecord | null> {
  const result = await dbQuery<SyncRunRow>(
    `
      select
        id,
        trigger_type,
        triggered_by_user_id,
        provider_mode,
        status,
        stores_total,
        stores_succeeded,
        stores_failed,
        reviews_upserted,
        summary_message,
        error_json,
        started_at,
        finished_at,
        updated_at
      from review_sync_runs
      order by started_at desc
      limit 1
    `,
  );

  const row = result.rows[0];
  return row ? mapSyncRun(row) : null;
}

export async function getPersistedProviderMode(): Promise<ProviderMode | null> {
  const latestRun = await getLatestSyncRun();
  return latestRun?.providerMode ?? null;
}

export async function getReviewStorageStats(): Promise<ReviewStorageStats> {
  const result = await dbQuery<{
    review_count: string;
    synced_store_count: string;
    latest_sync_at: string | Date | null;
  }>(
    `
      select
        (select count(*)::text from reviews) as review_count,
        (
          select count(*)::text
          from stores
          where last_review_sync_at is not null
        ) as synced_store_count,
        (
          select max(last_review_sync_at)
          from stores
        ) as latest_sync_at
    `,
  );

  return {
    reviewCount: Number(result.rows[0]?.review_count ?? "0"),
    syncedStoreCount: Number(result.rows[0]?.synced_store_count ?? "0"),
    latestSyncAt: toIsoString(result.rows[0]?.latest_sync_at ?? null),
  };
}

export async function persistSyncedStore(input: {
  store: StoreConfig;
  snapshot: StoreWithReviews;
  providerMode: ProviderMode;
}): Promise<number> {
  if (input.store.dbId == null) {
    throw new Error(`Store ${input.store.id} is missing a database id.`);
  }

  const storeDbId = input.store.dbId;

  return dbTransaction(async (client) => {
    await client.query(
      `
        update stores
        set address = $2,
            google_maps_url = $3,
            public_rating = $4,
            public_review_count = $5,
            last_review_sync_at = now(),
            last_review_sync_status = 'success',
            last_review_sync_error = null,
            last_review_source_mode = $6,
            updated_at = now()
        where id = $1
      `,
      [
        storeDbId,
        input.snapshot.address,
        input.snapshot.googleMapsUrl,
        input.snapshot.rating,
        input.snapshot.totalReviewCount,
        input.providerMode,
      ],
    );

    let upsertCount = 0;
    for (const review of input.snapshot.reviews) {
      const reviewId = await upsertReviewRecord(client, storeDbId, review);
      if (review.replyComment?.trim()) {
        await client.query(
          `
            insert into review_replies (review_id, reply_comment, reply_updated_at)
            values ($1, $2, $3)
            on conflict (review_id)
            do update
            set reply_comment = excluded.reply_comment,
                reply_updated_at = excluded.reply_updated_at,
                updated_at = now()
          `,
          [reviewId, review.replyComment.trim(), parseOptionalDate(review.replyUpdatedAt)],
        );
      } else {
        await client.query("delete from review_replies where review_id = $1", [reviewId]);
      }

      upsertCount += 1;
    }

    return upsertCount;
  });
}

export async function markStoreSyncFailure(input: {
  store: StoreConfig;
  providerMode: ProviderMode;
  message: string;
}): Promise<void> {
  if (input.store.dbId == null) {
    return;
  }

  await dbQuery(
    `
      update stores
      set last_review_sync_at = now(),
          last_review_sync_status = 'failed',
          last_review_sync_error = $2,
          last_review_source_mode = $3,
          updated_at = now()
      where id = $1
    `,
    [input.store.dbId, input.message, input.providerMode],
  );
}

async function upsertReviewRecord(
  client: PoolClient,
  storeDbId: number,
  review: Review,
): Promise<number> {
  const result = await client.query<{ id: number }>(
    `
      insert into reviews (
        store_id,
        external_review_id,
        author_name,
        author_photo_url,
        rating,
        text,
        relative_time_description,
        publish_time,
        source_updated_at,
        sentiment,
        status,
        suggested_reply,
        last_seen_at,
        raw_json
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), $13)
      on conflict (store_id, external_review_id)
      do update
      set author_name = excluded.author_name,
          author_photo_url = excluded.author_photo_url,
          rating = excluded.rating,
          text = excluded.text,
          relative_time_description = excluded.relative_time_description,
          publish_time = excluded.publish_time,
          source_updated_at = excluded.source_updated_at,
          sentiment = excluded.sentiment,
          status = excluded.status,
          suggested_reply = excluded.suggested_reply,
          last_seen_at = now(),
          raw_json = excluded.raw_json,
          updated_at = now()
      returning id
    `,
    [
      storeDbId,
      review.id,
      review.authorName,
      review.authorPhotoUrl ?? null,
      review.rating,
      review.text,
      review.relativeTimeDescription ?? null,
      parseOptionalDate(review.publishTime),
      parseOptionalDate(review.sourceUpdatedAt),
      review.sentiment,
      review.status,
      review.suggestedReply,
      review,
    ],
  );

  return result.rows[0].id;
}

function mapStoreWithoutReviews(store: StoreConfig): StoreWithReviews {
  return {
    storeId: store.id,
    storeName: store.displayName,
    city: store.city,
    region: store.region,
    managerName: store.managerName,
    placeId: store.googlePlaceId,
    address: store.address ?? "",
    googleMapsUrl: store.googleMapsUrl ?? "",
    rating: store.publicRating ?? null,
    totalReviewCount: store.publicReviewCount ?? null,
    lastReviewSyncAt: store.lastReviewSyncAt ?? null,
    lastReviewSyncStatus: store.lastReviewSyncStatus ?? null,
    sourceMode: store.lastReviewSourceMode ?? null,
    reviews: [],
  };
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
