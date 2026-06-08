import React, { useEffect, useRef, useState } from 'react';

type Props = {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  error?: boolean;
  autoFocus?: boolean;
};

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error,
  autoFocus = true,
}: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [focus, setFocus] = useState(0);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function setAt(i: number, ch: string): void {
    const arr = value.split('');
    arr[i] = ch;
    while (arr.length < length) arr.push('');
    const next = arr.slice(0, length).join('');
    onChange(next);
    if (ch && i < length - 1) refs.current[i + 1]?.focus();
    if (next.replace(/\s/g, '').length === length && onComplete) onComplete(next);
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      e.preventDefault();
      refs.current[i - 1]?.focus();
      setAt(i - 1, '');
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>): void {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (text.length === 0) return;
    e.preventDefault();
    onChange(text.padEnd(length, '').slice(0, length));
    refs.current[Math.min(text.length, length - 1)]?.focus();
    if (text.length === length && onComplete) onComplete(text);
  }

  return (
    <div className="flex justify-center gap-2" dir="ltr">
      {Array.from({ length }).map((_, i) => {
        const ch = value[i] ?? '';
        return (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={ch}
            inputMode="numeric"
            maxLength={1}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(-1);
              setAt(i, v);
            }}
            onKeyDown={(e) => handleKey(i, e)}
            onPaste={handlePaste}
            onFocus={() => setFocus(i)}
            className={`h-14 w-12 rounded-md border bg-surface text-center text-xl font-semibold text-ink transition-colors focus:outline-none ${
              error ? 'border-bad' : focus === i ? 'border-brand' : 'border-border2'
            }`}
          />
        );
      })}
    </div>
  );
}
