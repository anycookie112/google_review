interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "positive" | "warning" | "negative";
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-slate-900",
  positive: "text-emerald-700",
  warning: "text-amber-700",
  negative: "text-rose-700",
};

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-card p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">
        {label}
      </div>
      <div className={`mt-2 text-3xl font-semibold ${toneStyles[tone]}`}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}
