import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeNextPath } from "@/lib/auth/paths";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  missing_credentials: "Enter both your email address and password.",
  invalid_credentials: "The email or password did not match our records.",
};

const INFO_MESSAGES: Record<string, string> = {
  account_ready: "Your account is ready. Sign in with the password you just created.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; next?: string; message?: string };
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const errorCode = searchParams?.error ?? "";
  const errorMessage = ERROR_MESSAGES[errorCode];
  const infoMessage = INFO_MESSAGES[searchParams?.message ?? ""];
  const nextPath = sanitizeNextPath(searchParams?.next);

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-card p-6 sm:p-8">
        <div className="space-y-2">
          <div className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            Secure workspace
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-500">
            Sign in with an approved account to access the dashboard.
          </p>
        </div>

        <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
          <input type="hidden" name="next" value={nextPath} />

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Email address</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="admin@example.com"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Your password"
            />
          </label>

          {errorMessage ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          {infoMessage ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {infoMessage}
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Sign in
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          First-time setup is automatic: on startup, the app creates its auth table and seeds the
          initial admin user from <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code>. All
          other users register first, wait for admin approval, and then finish password setup.
        </div>

        <div className="mt-4 text-sm text-slate-600">
          Need access?{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Submit a registration request
          </Link>
        </div>
      </div>
    </div>
  );
}
