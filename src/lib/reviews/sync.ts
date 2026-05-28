import "server-only";

import type { ProviderMode, ReviewsApiError, ReviewSyncStatus, SyncTriggerType } from "@/types";
import {
  finishSyncRun,
  markStoreSyncFailure,
  persistSyncedStore,
  startSyncRun,
  type SyncRunRecord,
} from "@/lib/db/reviews";
import { listActiveStores } from "@/lib/db/stores";
import { resolveProvider } from "@/lib/providers";

export interface ReviewSyncResult {
  run: SyncRunRecord;
  providerMode: ProviderMode;
  status: ReviewSyncStatus;
  storesTotal: number;
  storesSucceeded: number;
  storesFailed: number;
  reviewsUpserted: number;
  errors: ReviewsApiError[];
}

export async function runReviewSync(input: {
  triggerType?: SyncTriggerType;
  triggeredByUserId?: number | null;
} = {}): Promise<ReviewSyncResult> {
  const run = await startSyncRun({
    triggerType: input.triggerType ?? "manual",
    triggeredByUserId: input.triggeredByUserId ?? null,
  });

  let providerMode: ProviderMode = "mock";

  try {
    const stores = await listActiveStores();
    const { provider, mode } = await resolveProvider();
    providerMode = mode;

    if (stores.length === 0) {
      await finishSyncRun({
        runId: run.id,
        providerMode,
        status: "success",
        storesTotal: 0,
        storesSucceeded: 0,
        storesFailed: 0,
        reviewsUpserted: 0,
        summaryMessage: "No active stores were configured to sync.",
      });

      return {
        run: {
          ...run,
          providerMode,
          status: "success",
          storesTotal: 0,
          storesSucceeded: 0,
          storesFailed: 0,
          reviewsUpserted: 0,
          summaryMessage: "No active stores were configured to sync.",
          finishedAt: new Date().toISOString(),
        },
        providerMode,
        status: "success",
        storesTotal: 0,
        storesSucceeded: 0,
        storesFailed: 0,
        reviewsUpserted: 0,
        errors: [],
      };
    }

    const storesBySlug = new Map(stores.map((store) => [store.id, store]));
    const { data, errors } = await provider.getStoresWithReviews(stores);

    let reviewsUpserted = 0;
    let storesSucceeded = 0;
    for (const snapshot of data) {
      const store = storesBySlug.get(snapshot.storeId);
      if (!store) {
        continue;
      }

      reviewsUpserted += await persistSyncedStore({
        store,
        snapshot,
        providerMode,
      });
      storesSucceeded += 1;
    }

    for (const error of errors) {
      const store = storesBySlug.get(error.storeId);
      if (store) {
        await markStoreSyncFailure({
          store,
          providerMode,
          message: error.message,
        });
      }
    }

    const storesFailed = errors.length;
    const status =
      storesFailed === 0 ? "success" : storesSucceeded > 0 ? "partial" : "failed";
    const summaryMessage = buildSummaryMessage({
      providerMode,
      storesSucceeded,
      storesFailed,
      reviewsUpserted,
    });

    await finishSyncRun({
      runId: run.id,
      providerMode,
      status,
      storesTotal: stores.length,
      storesSucceeded,
      storesFailed,
      reviewsUpserted,
      summaryMessage,
      errorJson: errors.length > 0 ? errors : null,
    });

    return {
      run: {
        ...run,
        providerMode,
        status,
        storesTotal: stores.length,
        storesSucceeded,
        storesFailed,
        reviewsUpserted,
        summaryMessage,
        errorJson: errors.length > 0 ? errors : null,
        finishedAt: new Date().toISOString(),
      },
      providerMode,
      status,
      storesTotal: stores.length,
      storesSucceeded,
      storesFailed,
      reviewsUpserted,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishSyncRun({
      runId: run.id,
      providerMode,
      status: "failed",
      storesTotal: 0,
      storesSucceeded: 0,
      storesFailed: 0,
      reviewsUpserted: 0,
      summaryMessage: message,
      errorJson: [{ storeId: "_global", storeName: "All stores", message }],
    });

    throw error;
  }
}

function buildSummaryMessage(input: {
  providerMode: ProviderMode;
  storesSucceeded: number;
  storesFailed: number;
  reviewsUpserted: number;
}): string {
  return [
    `Mode: ${input.providerMode.replace("_", " ")}`,
    `${input.storesSucceeded} store${input.storesSucceeded === 1 ? "" : "s"} synced`,
    input.storesFailed > 0
      ? `${input.storesFailed} store${input.storesFailed === 1 ? "" : "s"} failed`
      : "no store failures",
    `${input.reviewsUpserted} review${input.reviewsUpserted === 1 ? "" : "s"} upserted`,
  ].join(" · ");
}
