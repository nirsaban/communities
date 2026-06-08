import React from 'react';
import { Icon } from './Icon';

export function EmptyState({
  icon = 'inbox',
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-wash text-brand">
        <Icon name={icon} size={36} />
      </div>
      <h3 className="font-display text-2xl text-ink">{title}</h3>
      {body && <p className="mt-2 max-w-xs text-sm text-ink2">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
