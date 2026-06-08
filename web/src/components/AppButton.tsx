import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning';
type Size = 'lg' | 'sm';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
};

// Thin wrapper over the design system .btn class so screens read clean.
export function AppButton({
  variant = 'primary',
  size = 'lg',
  loading,
  block = true,
  className = '',
  children,
  ...rest
}: Props) {
  const v = `btn-${variant}`;
  const s = size === 'sm' ? 'btn-sm' : '';
  const l = loading ? 'btn-loading' : '';
  const inline = block ? '' : 'inline-flex';
  return (
    <button {...rest} className={`btn ${v} ${s} ${l} ${inline} ${className}`} style={!block ? { width: 'auto' } : undefined}>
      {children}
    </button>
  );
}
