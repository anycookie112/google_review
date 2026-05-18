import type { ReviewsApiError } from "@/types";

export function ErrorList({ errors }: { errors: ReviewsApiError[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm">
      <div className="font-semibold text-rose-900">
        {errors.length} store{errors.length === 1 ? "" : "s"} failed to load
      </div>
      <ul className="mt-1 space-y-0.5 text-rose-800">
        {errors.map((err) => (
          <li key={err.storeId}>
            <span className="font-medium">{err.storeName}:</span> {err.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
