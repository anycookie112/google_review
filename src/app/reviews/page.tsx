import { loadReviewsPayload } from "@/lib/loadReviews";
import { ModeBadge } from "@/components/ModeBadge";
import { DemoBanner } from "@/components/DemoBanner";
import { ErrorList } from "@/components/ErrorList";
import { ReviewsInbox } from "./ReviewsInbox";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const { mode, data, errors } = await loadReviewsPayload();
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reviews inbox</h1>
          <p className="text-sm text-slate-500">
            Every visible review across configured stores. Filter and triage from here.
          </p>
        </div>
        <ModeBadge mode={mode} />
      </header>

      {mode === "places" ? <DemoBanner /> : null}
      <ErrorList errors={errors} />

      <ReviewsInbox data={data} />
    </div>
  );
}
