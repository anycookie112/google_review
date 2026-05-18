import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reviews Monitor — Franchise Demo",
  description:
    "Monitor Google reviews across franchise locations. Proof-of-concept demo using Google Places API.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
                  <div className="text-xs text-slate-500">Franchise demo</div>
                </div>
              </div>
              <nav className="flex items-center gap-1 text-sm">
                <NavLink href="/">Dashboard</NavLink>
                <NavLink href="/reviews">Reviews inbox</NavLink>
              </nav>
            </div>
          </header>
          <main className="flex-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
          </main>
          <footer className="border-t border-slate-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 text-xs text-slate-500">
              Demo build. Public review data only. Not for production use without
              Google Business Profile API integration.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
    >
      {children}
    </Link>
  );
}
