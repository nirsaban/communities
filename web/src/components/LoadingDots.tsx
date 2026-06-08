export function LoadingDots({ size = 8 }: { size?: number }) {
  const dim = `${size}px`;
  return (
    <div className="flex items-center gap-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{ width: dim, height: dim, animationDelay: `${i * 180}ms` }}
          className="block rounded-full bg-brand animate-pulse-dot"
        />
      ))}
    </div>
  );
}
