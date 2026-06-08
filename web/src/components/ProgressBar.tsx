export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
      <div
        className="h-full rounded-full bg-brand transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
