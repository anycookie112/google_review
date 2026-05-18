import type { ProviderMode } from "@/types";

export function ModeBadge({ mode }: { mode: ProviderMode }) {
  if (mode === "mock") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 text-xs font-medium">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Demo Mode
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-medium">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Places API Mode
    </span>
  );
}
