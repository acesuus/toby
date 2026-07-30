interface RatingBadgeProps {
  timeControl: string;
  rating: number;
}

export function RatingBadge({ timeControl, rating }: RatingBadgeProps) {
  return (
    <span
      className="inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-sm text-[var(--ink)]"
      aria-label={`${timeControl} rating: ${rating}`}
    >
      {timeControl}{" "}
      <span className="font-notation ml-1">{rating}</span>
    </span>
  );
}
