import React from 'react';

export type Tab = { id: string; label: string; description: string };

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-ink-800 px-4">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`relative px-4 py-3 text-sm font-medium transition-colors ${
              isActive ? 'text-ink-50' : 'text-ink-400 hover:text-ink-200'
            }`}
            title={t.description}
          >
            {t.label}
            {isActive && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-sky-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}
