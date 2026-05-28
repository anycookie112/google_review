import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "Enter both your name and email address.",
  already_active: "This email already has an active account. Please sign in instead.",
  rejected:
    "This registration was previously rejected. Contact an administrator if you still need access.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: { error?: string; name?: string; email?: string };
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const errorMessage = ERROR_MESSAGES[searchParams?.error ?? ""];
  const name = searchParams?.name ?? "";
  const email = searchParams?.email ?? "";

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-card p-6 sm:p-8">
        <div className="space-y-2">
          <div className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Request access
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Register for the workspace</h1>
          <p className="text-sm text-slate-500">
            Submit your name and email first. An admin needs to approve your request before you can
            finish setting up your account.
          </p>
        </div>

        <form action="/api/auth/register" method="post" className="mt-6 space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Full name</span>
            <input
              name="displayName"
              defaultValue={name}
              autoComplete="name"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Jane Doe"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Email address</span>
            <input
              name="email"
              type="email"
              defaultValue={email}
              autoComplete="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="jane@example.com"
            />
          </label>

          {errorMessage ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Request access
          </button>
        </form>

        <div className="mt-5 text-sm text-slate-600">
          Already approved or already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Go to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
