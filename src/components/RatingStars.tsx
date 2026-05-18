interface RatingStarsProps {
  rating: number | null;
  size?: "sm" | "md";
  showNumber?: boolean;
}

export function RatingStars({ rating, size = "sm", showNumber = true }: RatingStarsProps) {
  const numeric = typeof rating === "number" ? rating : 0;
  const filled = Math.round(numeric);
  const px = size === "md" ? "text-base" : "text-sm";

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className={`text-amber-400 ${px}`} aria-label={`Rating: ${numeric} of 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n <= filled ? "" : "text-slate-300"}>
            ★
          </span>
        ))}
      </div>
      {showNumber ? (
        <span className="text-xs text-slate-600 font-medium">
          {rating == null ? "—" : numeric.toFixed(1)}
        </span>
      ) : null}
    </div>
  );
}
