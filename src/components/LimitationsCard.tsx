export function LimitationsCard() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-card p-5">
      <h2 className="text-sm font-semibold text-slate-900">
        Places API limitations
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Things this demo cannot do yet, and what unlocks them.
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        <li className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
          <span>
            <strong>Limited reviews per location.</strong> Places API only
            returns a small public sample (typically up to ~5 reviews per
            place), not the full history.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
          <span>
            <strong>Full review history</strong> requires the Google Business
            Profile API.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
          <span>
            <strong>Replying to reviews</strong> from this dashboard also
            requires the Google Business Profile API.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
          <span>
            <strong>Production rollout</strong> requires the client to grant
            manager / owner access to each verified Business Profile via OAuth.
          </span>
        </li>
      </ul>
    </section>
  );
}
