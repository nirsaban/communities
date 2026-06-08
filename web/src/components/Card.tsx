import React from 'react';

export function Card({
  children,
  className = '',
  as: As = 'div',
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return (
    <As
      {...rest}
      className={`rounded-md border border-border bg-surface shadow-low ${className}`}
    >
      {children}
    </As>
  );
}
