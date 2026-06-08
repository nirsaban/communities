type Size = 24 | 28 | 32 | 36 | 40 | 48 | 56 | 64 | 72 | 80 | 96;

function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function Avatar({
  name,
  src,
  size = 40,
}: {
  name?: string;
  src?: string | null;
  size?: Size;
}) {
  const dim = `${size}px`;
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ''}
        style={{ width: dim, height: dim }}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <div
      style={{ width: dim, height: dim }}
      className="flex items-center justify-center rounded-full bg-brand-wash text-brand-ink font-semibold"
    >
      <span style={{ fontSize: size * 0.42 }}>{initials(name)}</span>
    </div>
  );
}
