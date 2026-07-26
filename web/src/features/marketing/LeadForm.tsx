import { useState } from 'react';
import { t } from '../../i18n';

const LEADS_ENDPOINT = 'https://hub.miltech.cloud/api/public/leads';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const inputClass =
  'w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none';

export function LeadForm() {
  const l = t.landing;
  const [status, setStatus] = useState<Status>('idle');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="font-display text-lg font-bold">{l.leadFormSuccessTitle}</p>
        <p className="mt-1.5 text-muted">{l.leadFormSuccessBody}</p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4 rounded-2xl border border-border bg-surface p-6 text-start"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus('submitting');
        try {
          const res = await fetch(LEADS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product: 'communities', name, contact, message, website }),
          });
          if (!res.ok) throw new Error('request_failed');
          setStatus('success');
        } catch {
          setStatus('error');
        }
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">{l.leadFormNameLabel}</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">{l.leadFormContactLabel}</span>
        <input required value={contact} onChange={(e) => setContact(e.target.value)} className={inputClass} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">{l.leadFormMessageLabel}</span>
        <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className={inputClass} />
      </label>
      {/* Honeypot — hidden from real visitors */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute -z-10 h-0 w-0 opacity-0"
        aria-hidden="true"
      />
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-on transition-transform hover:scale-105 disabled:opacity-60"
      >
        {status === 'submitting' ? l.leadFormSubmitting : l.leadFormSubmit}
      </button>
      {status === 'error' && <p className="text-sm text-red-600">{l.leadFormErrorBody}</p>}
    </form>
  );
}
