import { requireAdminUser } from "@/lib/auth";
import { listAllStores } from "@/lib/db/stores";

export const dynamic = "force-dynamic";

const FLASH_MESSAGES: Record<string, string> = {
  created: "Store created.",
  updated: "Store updated.",
};

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "Slug, display name, city, region, and manager name are required.",
  duplicate_slug: "That store slug is already in use.",
  not_found: "The requested store could not be found.",
  forbidden: "You do not have permission to manage stores.",
};

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams?: { message?: string; error?: string };
}) {
  const currentUser = await requireAdminUser();
  const stores = await listAllStores();
  const activeStores = stores.filter((store) => store.isActive);
  const inactiveStores = stores.filter((store) => !store.isActive);

  const flashMessage = FLASH_MESSAGES[searchParams?.message ?? ""];
  const errorMessage = ERROR_MESSAGES[searchParams?.error ?? ""];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Store administration</h1>
          <p className="text-sm text-slate-500">
            Manage location metadata, Google identifiers, and sync readiness.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right shadow-card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Signed in as</div>
          <div className="text-sm font-semibold text-slate-900">{currentUser.displayName}</div>
          <div className="text-xs text-slate-500">{currentUser.email}</div>
        </div>
      </header>

      {flashMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {flashMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="All stores" value={stores.length} />
        <SummaryCard label="Active stores" value={activeStores.length} />
        <SummaryCard label="Inactive stores" value={inactiveStores.length} />
        <SummaryCard
          label="GBP-linked stores"
          value={stores.filter((store) => store.googleLocationName || store.googleAccountResourceName).length}
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Add a store</h2>
          <p className="text-xs text-slate-500">
            Add the basics first. You can refine GBP resource names after approval.
          </p>
        </div>
        <form action="/api/admin/stores/create" method="post" className="space-y-4">
          <StoreFields />
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Create store
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Existing stores</h2>
          <p className="text-xs text-slate-500">
            Each store keeps its own last sync status and location mapping fields.
          </p>
        </div>

        {stores.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No stores configured yet.
          </div>
        ) : (
          <div className="space-y-4">
            {stores.map((store) => (
              <section
                key={store.id}
                className="rounded-lg border border-slate-200 bg-white shadow-card p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{store.displayName}</div>
                    <div className="text-sm text-slate-500">
                      {store.city} · {store.region} · slug: <code>{store.id}</code>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Last sync: {store.lastReviewSyncAt ? formatDate(store.lastReviewSyncAt) : "Never"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill active={Boolean(store.isActive)} />
                    <SyncPill status={store.lastReviewSyncStatus ?? "never"} />
                  </div>
                </div>

                <form action="/api/admin/stores/update" method="post" className="space-y-4">
                  <input type="hidden" name="currentSlug" value={store.id} />
                  <StoreFields store={store} />
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      {store.lastReviewSyncError
                        ? `Last error: ${store.lastReviewSyncError}`
                        : "No sync errors recorded."}
                    </div>
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Save changes
                    </button>
                  </div>
                </form>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StoreFields({ store }: { store?: Awaited<ReturnType<typeof listAllStores>>[number] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Slug" name="slug" defaultValue={store?.id ?? ""} required />
      <Field label="Display name" name="displayName" defaultValue={store?.displayName ?? ""} required />
      <Field label="City" name="city" defaultValue={store?.city ?? ""} required />
      <Field label="Region" name="region" defaultValue={store?.region ?? ""} required />
      <Field
        label="Manager name"
        name="managerName"
        defaultValue={store?.managerName ?? ""}
        required
      />
      <Field
        label="Google Place ID"
        name="googlePlaceId"
        defaultValue={store?.googlePlaceId ?? ""}
        hint="Keep this accurate even if GBP becomes the main source."
      />
      <Field
        label="GBP location name"
        name="googleLocationName"
        defaultValue={store?.googleLocationName ?? ""}
        hint="Example: locations/1234567890"
      />
      <Field
        label="GBP account resource"
        name="googleAccountResourceName"
        defaultValue={store?.googleAccountResourceName ?? ""}
        hint="Example: accounts/1234567890"
      />
      <div className="md:col-span-2 space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor={`notes-${store?.id ?? "new"}`}>
          Notes
        </label>
        <textarea
          id={`notes-${store?.id ?? "new"}`}
          name="notes"
          defaultValue={store?.notes ?? ""}
          rows={3}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </div>
      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={store ? Boolean(store.isActive) : true}
          className="h-4 w-4 rounded border-slate-300 text-brand-600"
        />
        Store is active
      </label>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  hint,
  required,
}: {
  label: string;
  name: string;
  defaultValue: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-700" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
      />
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-card">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? "bg-emerald-100 text-emerald-800"
          : "bg-slate-200 text-slate-700"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function SyncPill({ status }: { status: "never" | "running" | "success" | "failed" | "partial" }) {
  const styles: Record<typeof status, string> = {
    never: "bg-slate-100 text-slate-700",
    running: "bg-sky-100 text-sky-800",
    success: "bg-emerald-100 text-emerald-800",
    failed: "bg-rose-100 text-rose-800",
    partial: "bg-amber-100 text-amber-800",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      Sync: {status}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
