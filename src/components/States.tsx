export function LoadingState({ label }: { label?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
      <div className="inline-block h-5 w-5 rounded-full border-2 border-slate-300 border-t-brand-500 animate-spin" />
      <div className="mt-2">{label ?? "Loading…"}</div>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <div className="text-sm font-medium text-slate-700">{title}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}
