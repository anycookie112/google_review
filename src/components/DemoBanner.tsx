export function DemoBanner() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
      <div className="font-semibold">Demo mode: using Google Places API.</div>
      <div className="text-amber-800">
        Full review history, reply status, and reply posting require Google
        Business Profile API access. The Places API only returns a small public
        sample of reviews per location.
      </div>
    </div>
  );
}
