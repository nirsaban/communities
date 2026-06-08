import type { CSSProperties } from 'react';

type Props = { name: string; className?: string; size?: number; style?: CSSProperties };

// Material Symbols Rounded — name list at fonts.google.com/icons.
export function Icon({ name, className = '', size = 24, style }: Props) {
  return (
    <span
      className={`ms select-none ${className}`}
      style={{ fontSize: size, lineHeight: 1, ...style }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
