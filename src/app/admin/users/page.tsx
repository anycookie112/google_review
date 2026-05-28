import { requireAdminUser } from "@/lib/auth";
import { listUsersForAdmin } from "@/lib/db/users";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const FLASH_MESSAGES: Record<string, string> = {
  approved: "Registration approved. The user can now finish account setup.",
  rejected: "Registration request rejected.",
  role_updated: "User role updated.",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_role: "That role selection is not valid.",
  last_admin: "You cannot demote the last active admin account.",
  forbidden: "You do not have permission to perform that action.",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: { message?: string; error?: string };
}) {
  const currentUser = await requireAdminUser();
  const users = await listUsersForAdmin();
  const requestHeaders = headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost || requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  const appOrigin = host ? `${protocol}://${host}` : "";

  const pending = users.filter((user) => user.status === "pending_approval");
  const setupPending = users.filter((user) => user.status === "approved_setup_pending");
  const active = users.filter((user) => user.status === "active");
  const rejected = users.filter((user) => user.status === "rejected");

  const flashMessage = FLASH_MESSAGES[searchParams?.message ?? ""];
  const errorMessage = ERROR_MESSAGES[searchParams?.error ?? ""];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">User administration</h1>
          <p className="text-sm text-slate-500">
            Approve registrations, track onboarding, and adjust user roles.
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
        <SummaryCard label="Pending approvals" value={pending.length} tone={pending.length ? "warning" : "default"} />
        <SummaryCard label="Awaiting setup" value={setupPending.length} />
        <SummaryCard label="Active users" value={active.length} />
        <SummaryCard label="Rejected" value={rejected.length} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Pending approvals</h2>
          <p className="text-xs text-slate-500">
            Review new registration requests and decide who gets access.
          </p>
        </div>

        {pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No pending registrations right now.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((user) => (
              <div
                key={user.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{user.displayName}</div>
                    <div className="text-sm text-slate-600">{user.email}</div>
                    <div className="text-xs text-slate-500">
                      Requested {formatDate(user.createdAt)}
                    </div>
                  </div>
                  <div className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                    Pending approval
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <form action="/api/admin/users/approve" method="post" className="flex flex-wrap gap-2 items-center">
                    <input type="hidden" name="userId" value={user.id} />
                    <select
                      name="role"
                      defaultValue="member"
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900"
                    >
                      <option value="member">Approve as member</option>
                      <option value="admin">Approve as admin</option>
                    </select>
                    <button
                      type="submit"
                      className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                    >
                      Approve
                    </button>
                  </form>

                  <form action="/api/admin/users/reject" method="post">
                    <input type="hidden" name="userId" value={user.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Approved, waiting for setup</h2>
          <p className="text-xs text-slate-500">
            These users have been approved and are waiting to finish their password setup.
          </p>
        </div>

        {setupPending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No users are waiting on setup.
          </div>
        ) : (
          <div className="space-y-3">
            {setupPending.map((user) => (
              <div key={user.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{user.displayName}</div>
                    <div className="text-sm text-slate-600">{user.email}</div>
                    <div className="text-xs text-slate-500">
                      Approved {user.approvedAt ? formatDate(user.approvedAt) : "just now"}
                    </div>
                  </div>
                  <div className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">
                    Awaiting setup
                  </div>
                </div>
                {user.registrationToken ? (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Setup link
                    </div>
                    <input
                      readOnly
                      value={buildSetupLink(user.registrationToken, appOrigin)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                    />
                    <p className="text-xs text-slate-500">
                      Share this link if the user lost their original registration page. They can
                      also re-register with the same email to recover it.
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Active users</h2>
          <p className="text-xs text-slate-500">
            Manage roles for users who already completed onboarding.
          </p>
        </div>

        {active.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No active users yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left font-medium px-4 py-2">User</th>
                  <th className="text-left font-medium px-4 py-2">Status</th>
                  <th className="text-left font-medium px-4 py-2">Joined</th>
                  <th className="text-left font-medium px-4 py-2">Role</th>
                  <th className="text-left font-medium px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {active.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-slate-900">{user.displayName}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3 align-top">
                      <form action="/api/admin/users/update-role" method="post" className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="userId" value={user.id} />
                        <select
                          name="role"
                          defaultValue={user.role}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-500">
                      {user.id === currentUser.id ? "Current account" : " "}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {rejected.length > 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white shadow-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Rejected requests</h2>
            <p className="text-xs text-slate-500">Recent requests that were declined.</p>
          </div>
          <div className="space-y-3">
            {rejected.map((user) => (
              <div key={user.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">{user.displayName}</div>
                <div className="text-sm text-slate-600">{user.email}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {user.rejectionReason || "Registration was not approved."}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning";
}) {
  const toneClassName =
    tone === "warning" && value > 0
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-slate-200 bg-white text-slate-900";

  return (
    <div className={`rounded-lg border shadow-card p-4 ${toneClassName}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildSetupLink(token: string, appOrigin: string) {
  const path = `/register/status?token=${encodeURIComponent(token)}`;
  return appOrigin ? `${appOrigin}${path}` : path;
}
