import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findUserByRegistrationToken } from "@/lib/db/users";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "Enter your name and a password to finish setup.",
  password_mismatch: "The password confirmation did not match.",
  weak_password: "Use a password with at least 8 characters.",
  not_ready:
    "This account is not ready to activate yet. Wait for admin approval, then try again.",
  invalid_token: "We couldn't find that registration link. Register again if needed.",
};

export default async function RegisterStatusPage({
  searchParams,
}: {
  searchParams?: { token?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const token = searchParams?.token?.trim() ?? "";
  if (!token) {
    return <InvalidRegistrationState />;
  }

  const registration = await findUserByRegistrationToken(token);
  if (!registration) {
    return <InvalidRegistrationState errorCode="invalid_token" />;
  }

  const errorMessage = ERROR_MESSAGES[searchParams?.error ?? ""];

  if (registration.status === "approved_setup_pending") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-card p-6 sm:p-8">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Approval complete
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Finish your account setup</h1>
            <p className="text-sm text-slate-500">
              Your registration has been approved. Set your preferred name and password, then
              you’ll be able to sign in normally.
            </p>
          </div>

          <form action="/api/auth/activate" method="post" className="mt-6 space-y-4">
            <input type="hidden" name="token" value={token} />

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Email address</span>
              <input
                value={registration.email}
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Display name</span>
              <input
                name="displayName"
                defaultValue={registration.displayName}
                autoComplete="name"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Create password</span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="At least 8 characters"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Confirm password</span>
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Repeat your password"
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
              Save account and continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (registration.status === "active") {
    return (
      <CenteredCard
        badge="Account ready"
        badgeClassName="bg-emerald-50 text-emerald-700"
        title="Your account is active"
        body="Your setup is already complete. You can sign in with the password you created."
      >
        <Link
          href="/login?message=account_ready"
          className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Go to sign in
        </Link>
      </CenteredCard>
    );
  }

  if (registration.status === "rejected") {
    return (
      <CenteredCard
        badge="Not approved"
        badgeClassName="bg-rose-50 text-rose-700"
        title="Your access request was rejected"
        body={registration.rejectionReason || "An administrator rejected this registration request."}
      >
        <Link href="/register" className="text-sm font-medium text-brand-600 hover:underline">
          Submit a new request
        </Link>
      </CenteredCard>
    );
  }

  return (
    <CenteredCard
      badge="Pending approval"
      badgeClassName="bg-amber-50 text-amber-700"
      title="Your request is waiting for admin approval"
      body="Keep this page bookmarked. Refresh it after an admin approves your registration and you’ll be able to finish setting up your password."
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        Requested email: <span className="font-medium text-slate-800">{registration.email}</span>
      </div>
    </CenteredCard>
  );
}

function InvalidRegistrationState({ errorCode }: { errorCode?: string }) {
  return (
    <CenteredCard
      badge="Registration link"
      badgeClassName="bg-slate-100 text-slate-700"
      title="We couldn't find that registration link"
      body={
        ERROR_MESSAGES[errorCode ?? ""] ||
        "Register again to create a fresh approval request if needed."
      }
    >
      <Link href="/register" className="text-sm font-medium text-brand-600 hover:underline">
        Back to registration
      </Link>
    </CenteredCard>
  );
}

function CenteredCard({
  badge,
  badgeClassName,
  title,
  body,
  children,
}: {
  badge: string;
  badgeClassName: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-card p-6 sm:p-8 space-y-4">
        <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClassName}`}>
          {badge}
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{body}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
