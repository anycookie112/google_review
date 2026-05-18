import Link from "next/link";

export default function StoreNotFound() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-card p-8 text-center">
      <h1 className="text-lg font-semibold text-slate-900">Store not found</h1>
      <p className="mt-1 text-sm text-slate-500">
        We couldn't find that store in the configured list, or its data failed
        to load. Check{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">data/stores.ts</code>.
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex rounded-md bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3 py-1.5"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
