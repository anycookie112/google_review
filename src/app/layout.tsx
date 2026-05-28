import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { countPendingApprovals } from "@/lib/db/users";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reviews Monitor",
  description:
    "Monitor Google reviews across franchise locations with a protected internal dashboard.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const pendingApprovals = user?.role === "admin" ? await countPendingApprovals() : 0;

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-slate-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  aria-hidden
                  className="h-9 w-9 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold"
                >
                  R
                </div>
                <div className="leading-tight">
                  <div className="font-semibold text-slate-900">Reviews Monitor</div>
                  <div className="text-xs text-slate-500">
                    {user ? "Internal workspace" : "Secure sign-in"}
                  </div>
                </div>
              </div>
              {user ? (
                <div className="flex items-center gap-3">
                  <nav className="flex items-center gap-1 text-sm">
                    <NavLink href="/dashboard">Dashboard</NavLink>
                    <NavLink href="/reviews">Reviews inbox</NavLink>
                    {user.role === "admin" ? (
                      <>
                        <NavLink
                          href="/admin/users"
                          badge={pendingApprovals > 0 ? pendingApprovals : undefined}
                        >
                          Admin
                        </NavLink>
                        <NavLink href="/admin/stores">Stores</NavLink>
                        <NavLink href="/admin/sync">Sync</NavLink>
                        <NavLink href="/admin/google">Google</NavLink>
                      </>
                    ) : null}
                  </nav>
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium text-slate-800">{user.displayName}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </div>
                  <form action="/api/auth/logout" method="post">
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-md text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              ) : (
                <nav className="flex items-center gap-1 text-sm">
                  <NavLink href="/login">Sign in</NavLink>
                  <NavLink href="/register">Register</NavLink>
                </nav>
              )}
            </div>
          </header>
          <main className="flex-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
          </main>
          <footer className="border-t border-slate-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 text-xs text-slate-500">
              Authenticated workspace with Postgres-backed users, stores, and synced review data.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

function NavLink({
  href,
  children,
  badge,
}: {
  href: string;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition inline-flex items-center gap-2"
    >
      {children}
      {badge ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
