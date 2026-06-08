import React from 'react';

export function SectionHeader({ title, link, onLink }: { title: string; link?: string; onLink?: () => void }) {
  return (
    <div className="section-header">
      <span className="sh-title">{title}</span>
      {link && (
        <button type="button" onClick={onLink} className="sh-link">
          {link}
        </button>
      )}
    </div>
  );
}
